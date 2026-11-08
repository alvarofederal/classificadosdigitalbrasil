// APLICAÇÃO — álbum do anúncio: até 6 fotos (RF-16, ADR-05).

import { MAXIMO_FOTOS } from "@/domain/anuncio/anuncio"
import { type Result, falha, ok } from "@/domain/shared/result"
import type { AnuncioRegistro, AnuncioRepository, AssinaturaDeUpload, FotoRepository, FotoStorage, NovaFoto } from "../../ports/caderno"
import { type Ator, podeMexer } from "./gerenciar-anuncios"

async function anuncioEditavel(anuncios: AnuncioRepository, ator: Ator, anuncioId: string): Promise<AnuncioRegistro | null> {
  const anuncio = await anuncios.buscarPorId(anuncioId)
  return anuncio && podeMexer(ator, anuncio) && anuncio.situacao !== "REMOVIDO" ? anuncio : null
}

export class PrepararUploadDeFotosUseCase {
  constructor(
    private readonly anuncios: AnuncioRepository,
    private readonly fotos: FotoRepository,
    private readonly storage: FotoStorage,
  ) {}

  async executar(ator: Ator, entrada: { anuncioId: string; quantidade: number }): Promise<Result<{ assinaturas: AssinaturaDeUpload[] }>> {
    const anuncio = await anuncioEditavel(this.anuncios, ator, entrada.anuncioId)
    if (!anuncio) return falha("NAO_ENCONTRADO", "Anúncio não encontrado.")
    if (!Number.isInteger(entrada.quantidade) || entrada.quantidade < 1) return falha("QUANTIDADE_INVALIDA", "Escolha ao menos uma foto.")
    const vagas = MAXIMO_FOTOS - (await this.fotos.listar(anuncio.id)).length
    if (entrada.quantidade > vagas) {
      return falha("LIMITE_DE_FOTOS", vagas > 0 ? `Cabem mais ${vagas} foto(s) neste anúncio.` : `O álbum aceita até ${MAXIMO_FOTOS} fotos.`)
    }
    return ok({ assinaturas: this.storage.assinarUploads(this.storage.pastaDoAnuncio(anuncio.id), entrada.quantidade) })
  }
}

export class AdicionarFotosUseCase {
  constructor(
    private readonly anuncios: AnuncioRepository,
    private readonly fotos: FotoRepository,
    private readonly storage: FotoStorage,
  ) {}

  async executar(ator: Ator, entrada: { anuncioId: string; fotos: NovaFoto[] }): Promise<Result<true>> {
    const anuncio = await anuncioEditavel(this.anuncios, ator, entrada.anuncioId)
    if (!anuncio) return falha("NAO_ENCONTRADO", "Anúncio não encontrado.")
    if (entrada.fotos.length === 0) return ok(true)
    const pasta = this.storage.pastaDoAnuncio(anuncio.id)
    if (entrada.fotos.some((foto) => !this.storage.pertenceAPasta(foto, pasta))) {
      return falha("FOTO_DE_ORIGEM_INVALIDA", "Envie as fotos pelo botão do álbum.")
    }
    const existentes = (await this.fotos.listar(anuncio.id)).length
    if (existentes + entrada.fotos.length > MAXIMO_FOTOS) return falha("LIMITE_DE_FOTOS", `O álbum aceita até ${MAXIMO_FOTOS} fotos.`)
    await this.fotos.adicionar(anuncio.id, entrada.fotos)
    return ok(true)
  }
}

export class ReordenarFotosUseCase {
  constructor(
    private readonly anuncios: AnuncioRepository,
    private readonly fotos: FotoRepository,
  ) {}

  async executar(ator: Ator, entrada: { anuncioId: string; ids: string[] }): Promise<Result<true>> {
    const anuncio = await anuncioEditavel(this.anuncios, ator, entrada.anuncioId)
    if (!anuncio) return falha("NAO_ENCONTRADO", "Anúncio não encontrado.")
    const atuais = await this.fotos.listar(anuncio.id)
    const mesmoConjunto =
      atuais.length === entrada.ids.length && new Set(entrada.ids).size === entrada.ids.length && atuais.every((f) => entrada.ids.includes(f.id))
    if (!mesmoConjunto) return falha("ORDEM_INVALIDA", "O álbum mudou. Recarregue a página e tente de novo.")
    await this.fotos.reordenar(anuncio.id, entrada.ids)
    return ok(true)
  }
}

export class RemoverFotoUseCase {
  constructor(
    private readonly anuncios: AnuncioRepository,
    private readonly fotos: FotoRepository,
    private readonly storage: FotoStorage,
  ) {}

  async executar(ator: Ator, entrada: { anuncioId: string; fotoId: string }): Promise<Result<true>> {
    const anuncio = await anuncioEditavel(this.anuncios, ator, entrada.anuncioId)
    if (!anuncio) return falha("NAO_ENCONTRADO", "Anúncio não encontrado.")
    const foto = (await this.fotos.listar(anuncio.id)).find((f) => f.id === entrada.fotoId)
    if (!foto) return falha("NAO_ENCONTRADO", "Foto não encontrada.")
    await this.fotos.remover(foto.id)
    await this.storage.remover([foto.publicId])
    return ok(true)
  }
}
