// INFRAESTRUTURA — relógio, códigos aleatórios, bcrypt, tokens de sessão e Cloudinary.

import bcrypt from "bcryptjs"
import { v2 as cloudinary } from "cloudinary"
import { createHash, randomBytes, randomInt, randomUUID } from "crypto"
import type { GeradorDeToken, HashDeSenha } from "@/application/ports/acesso"
import type { AssinaturaDeUpload, FotoStorage, NovaFoto } from "@/application/ports/caderno"
import type { GeradorDeCodigo, Relogio } from "@/application/ports/sistema"

export class RelogioDoSistema implements Relogio {
  agora(): Date {
    return new Date()
  }
}

export class GeradorDeCodigoAleatorio implements GeradorDeCodigo {
  codigo(alfabeto: string, tamanho: number): string {
    return Array.from({ length: tamanho }, () => alfabeto[randomInt(alfabeto.length)]).join("")
  }
}

export class BcryptHashDeSenha implements HashDeSenha {
  private static readonly CUSTO = 10
  gerar(senha: string): Promise<string> {
    return bcrypt.hash(senha, BcryptHashDeSenha.CUSTO)
  }
  comparar(senha: string, hash: string): Promise<boolean> {
    return bcrypt.compare(senha, hash)
  }
}

/** O cookie leva o token; o banco guarda só o SHA-256 dele. */
export class TokenDeSessaoAleatorio implements GeradorDeToken {
  novoToken(): string {
    return randomBytes(32).toString("base64url")
  }
  hash(token: string): string {
    return createHash("sha256").update(token).digest("hex")
  }
}

export interface ConfiguracaoCloudinary {
  cloudName?: string
  apiKey?: string
  apiSecret?: string
  pastaRaiz: string
}

/** ADR-05: o navegador envia direto ao Cloudinary com uma assinatura por arquivo gerada aqui. */
export class CloudinaryFotoStorage implements FotoStorage {
  constructor(private readonly cfg: ConfiguracaoCloudinary) {
    if (cfg.cloudName && cfg.apiKey && cfg.apiSecret) {
      cloudinary.config({ cloud_name: cfg.cloudName, api_key: cfg.apiKey, api_secret: cfg.apiSecret, secure: true })
    }
  }

  pastaDoAnuncio(anuncioId: string): string {
    return `${this.cfg.pastaRaiz}/anuncios/${anuncioId}`
  }

  assinarUploads(pasta: string, quantidade: number): AssinaturaDeUpload[] {
    const { cloudName, apiKey, apiSecret } = this.cfg
    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error("Cloudinary não configurado: defina CLOUDINARY_NAME, CLOUDINARY_KEY e CLOUDINARY_SECRET.")
    }
    const timestamp = String(Math.round(Date.now() / 1000))
    return Array.from({ length: quantidade }, () => {
      const publicId = `${pasta}/${randomUUID()}`
      const signature = cloudinary.utils.api_sign_request({ public_id: publicId, timestamp }, apiSecret)
      return {
        url: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        campos: { api_key: apiKey, timestamp, public_id: publicId, signature },
      }
    })
  }

  pertenceAPasta(foto: NovaFoto, pasta: string): boolean {
    const prefixoUrl = `https://res.cloudinary.com/${this.cfg.cloudName}/image/upload/`
    return foto.publicId.startsWith(`${pasta}/`) && foto.url.startsWith(prefixoUrl) && foto.url.includes(foto.publicId)
  }

  async remover(publicIds: string[]): Promise<void> {
    if (publicIds.length === 0 || !this.cfg.apiSecret) return
    try {
      await cloudinary.api.delete_resources(publicIds)
    } catch (erro) {
      // O registro já saiu do banco; um arquivo órfão no Cloudinary não pode travar o anunciante.
      console.error("[cloudinary] falha ao remover imagens", publicIds, erro)
    }
  }
}
