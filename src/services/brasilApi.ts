/**
 * Cliente mínimo da BrasilAPI (https://brasilapi.com.br).
 *
 * Usado como complemento à lista local de bancos (`src/constants/banks.ts`):
 * quando o usuário procura um banco que não está na lista padrão, o seletor
 * de contas carrega a relação completa de instituições do Banco Central.
 */

const BRASIL_API_BANKS_URL = "https://brasilapi.com.br/api/banks/v1";

/** Item relevante retornado por `GET /api/banks/v1`. */
export interface BrasilApiBank {
  /** Identificador ISPB da instituição no Banco Central. */
  ispb: string;
  /** Nome curto (ex.: "BCO DO BRASIL S.A."). */
  name: string;
  /** Código COMPE; `null` em entradas sem código (ex.: Selic, Bacen). */
  code: number | null;
  /** Nome completo/razão social (ex.: "Banco do Brasil S.A."). */
  fullName: string;
}

export interface FetchBanksOptions {
  /** Cancela a requisição (ex.: quando o componente é desmontado). */
  signal?: AbortSignal;
  /** Ignora o cache em memória e busca a lista novamente. */
  force?: boolean;
}

/** A lista completa não muda com frequência: guardamos em memória por sessão. */
let banksCache: BrasilApiBank[] | null = null;

/** Busca a lista completa de bancos do Banco Central (com cache em memória). */
export async function fetchBanks(
  options: FetchBanksOptions = {},
): Promise<BrasilApiBank[]> {
  const { signal, force = false } = options;

  if (banksCache && !force) return banksCache;

  const response = await fetch(BRASIL_API_BANKS_URL, {
    signal,
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(
      `Não foi possível carregar a lista de bancos (HTTP ${response.status}).`,
    );
  }

  const payload: unknown = await response.json();
  if (!Array.isArray(payload)) {
    throw new Error("Resposta inesperada ao carregar a lista de bancos.");
  }

  banksCache = payload
    .map(toBrasilApiBank)
    .filter((bank): bank is BrasilApiBank => bank !== null)
    .sort((a, b) => a.fullName.localeCompare(b.fullName, "pt-BR"));

  return banksCache;
}

/** Descarta o cache em memória (útil para testes ou atualização manual). */
export function clearBanksCache(): void {
  banksCache = null;
}

/** Valida/normaliza um item da resposta, descartando entradas sem nome. */
function toBrasilApiBank(entry: unknown): BrasilApiBank | null {
  if (!entry || typeof entry !== "object") return null;

  const { ispb, name, code, fullName } = entry as Record<string, unknown>;
  const shortName = typeof name === "string" ? name.trim() : "";
  const longName = typeof fullName === "string" ? fullName.trim() : "";
  const resolvedName = longName || shortName;

  if (!resolvedName) return null;

  return {
    ispb: typeof ispb === "string" ? ispb : "",
    name: shortName || resolvedName,
    code: typeof code === "number" ? code : null,
    fullName: resolvedName,
  };
}
