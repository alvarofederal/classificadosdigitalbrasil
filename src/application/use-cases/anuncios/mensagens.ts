// APLICAÇÃO — mensagem de quem viu o anúncio e o aviso ao dono (RF-17, RF-23, RN-17, RN-18; feature 010: RF-100 a RF-104, RN-100 a RN-104).

import { estaNoAr } from "@/domain/anuncio/anuncio"
import { JANELA_DOS_AVISOS_MS, deveAvisar, montarAvisoDeMensagemNova } from "@/domain/mensagem/aviso"
import { LIMITES_DA_MENSAGEM, type NovaMensagem, normalizarMensagem, validarMensagem } from "@/domain/mensagem/mensagem"
import { type Result, falha, falhaDeValidacao, ok } from "@/domain/shared/result"
import type { UsuarioRepository } from "../../ports/acesso"
import type { AnuncioRegistro, AnuncioRepository, MensagemRepository } from "../../ports/caderno"
import type { Correio, EnderecosDoSite } from "../../ports/correio"
import type { Relogio, SegundoPlano } from "../../ports/sistema"
import type { Ator } from "./gerenciar-anuncios"

export type DestinoDoAviso = "ENVIADO" | "SEM_CORREIO" | "LIMITE_DO_DIA" | "DONO_INDISPONIVEL"

/** RF-100: avisa o dono por e-mail que chegou mensagem. Roda depois de a mensagem estar gravada. */
export class AvisarMensagemNovaUseCase {
  constructor(
    private readonly usuarios: UsuarioRepository,
    private readonly mensagens: MensagemRepository,
    private readonly correio: Correio,
    private readonly relogio: Relogio,
    private readonly enderecos: EnderecosDoSite,
  ) {}

  async executar(anuncio: Pick<AnuncioRegistro, "id" | "codigo" | "titulo" | "usuarioId">, mensagem: NovaMensagem): Promise<Result<DestinoDoAviso>> {
    // RF-104: sem servidor de e-mail, a mensagem fica só em Minha conta.
    if (!this.correio.ligado) return ok("SEM_CORREIO")

    // RN-101: a contagem inclui a mensagem que acabou de ser gravada.
    const desde = new Date(this.relogio.agora().getTime() - JANELA_DOS_AVISOS_MS)
    const recebidasNoDia = await this.mensagens.contarDoAnuncioDesde(anuncio.id, desde)
    if (!deveAvisar(recebidasNoDia)) return ok("LIMITE_DO_DIA")

    // RN-104: conta desativada não recebe aviso.
    const dono = await this.usuarios.buscarPorId(anuncio.usuarioId)
    if (!dono || !dono.ativo) return ok("DONO_INDISPONIVEL")

    // RN-102: do cadastro do dono, só o nome entra na carta; o e-mail é apenas o destino.
    const carta = montarAvisoDeMensagemNova({
      dono: { nome: dono.nome },
      anuncio,
      mensagem,
      linkDasMensagens: this.enderecos.mensagensDoAnuncio(anuncio.id),
      recebidasNoDia,
    })
    const envio = await this.correio.enviar({ nome: dono.nome, email: dono.email }, carta)
    if (!envio.ok) {
      // RN-100: a mensagem já está gravada; a falha do aviso só fica registrada (sem dados pessoais no log).
      console.error("[aviso de mensagem] não enviado para o dono do anúncio", anuncio.codigo, envio.codigo, envio.mensagem)
      return envio
    }
    return ok("ENVIADO")
  }
}

export class EnviarMensagemUseCase {
  constructor(
    private readonly anuncios: AnuncioRepository,
    private readonly mensagens: MensagemRepository,
    private readonly relogio: Relogio,
    private readonly avisar: AvisarMensagemNovaUseCase,
    private readonly segundoPlano: SegundoPlano,
  ) {}

  async executar(anuncioId: string, entrada: NovaMensagem): Promise<Result<true>> {
    const agora = this.relogio.agora()
    const anuncio = await this.anuncios.buscarPorId(anuncioId)
    // RN-17: só anúncio no ar recebe mensagem.
    if (!anuncio || !estaNoAr(anuncio.situacao, anuncio.expiraEm, agora)) return falha("NAO_DISPONIVEL", "Este anúncio não está mais no ar.")

    const mensagem = normalizarMensagem(entrada)
    const erros = validarMensagem(mensagem)
    if (Object.keys(erros).length > 0) return falhaDeValidacao(erros)

    // RN-18: freio contra repetição do mesmo contato.
    const recentes = await this.mensagens.contarDoContatoDesde(anuncio.id, mensagem.contato, new Date(agora.getTime() - 86_400_000))
    if (recentes >= LIMITES_DA_MENSAGEM.porContatoPorDia) {
      return falha("MUITAS_MENSAGENS", "Você já enviou mensagens para este anúncio hoje. Aguarde a resposta do anunciante.")
    }
    await this.mensagens.inserir(anuncio.id, mensagem)
    // RF-102 e RN-100: o aviso ao dono sai depois da resposta e nunca derruba a mensagem.
    this.segundoPlano.executar(() => this.avisar.executar(anuncio, mensagem))
    return ok(true)
  }
}

export class MarcarMensagensLidasUseCase {
  constructor(
    private readonly anuncios: AnuncioRepository,
    private readonly mensagens: MensagemRepository,
  ) {}

  /** Só o dono marca como lidas: o administrador olhando o anúncio não apaga o aviso de "nova mensagem". */
  async executar(ator: Ator, anuncioId: string): Promise<void> {
    const anuncio = await this.anuncios.buscarPorId(anuncioId)
    if (anuncio && anuncio.usuarioId === ator.usuarioId) await this.mensagens.marcarComoLidas(anuncio.id)
  }
}
