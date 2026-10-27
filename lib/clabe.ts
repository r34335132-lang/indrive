/** Bancos más comunes por los 3 primeros dígitos de la CLABE. */
const BANKS: Record<string, string> = {
  '002': 'Banamex',
  '012': 'BBVA',
  '014': 'Santander',
  '021': 'HSBC',
  '030': 'BanBajío',
  '036': 'Inbursa',
  '042': 'Mifel',
  '044': 'Scotiabank',
  '058': 'Banregio / Hey Banco',
  '062': 'Afirme',
  '072': 'Banorte',
  '127': 'Banco Azteca',
  '130': 'Compartamos',
  '136': 'Intercam',
  '137': 'BanCoppel',
  '143': 'CIBanco',
  '646': 'STP',
  '638': 'Nu México',
  '722': 'Mercado Pago',
  '728': 'Spin by OXXO',
};

export function cleanClabe(value: string) {
  return value.replace(/\D/g, '').slice(0, 18);
}

export function isValidClabe(value: string) {
  const clabe = cleanClabe(value);
  if (clabe.length !== 18) return false;
  const weights = [3, 7, 1];
  let total = 0;
  for (let i = 0; i < 17; i += 1) {
    total += (Number(clabe[i]) * weights[i % 3]) % 10;
  }
  return (10 - (total % 10)) % 10 === Number(clabe[17]);
}

export function bankFromClabe(value: string): string | null {
  const clabe = cleanClabe(value);
  return clabe.length >= 3 ? BANKS[clabe.slice(0, 3)] ?? null : null;
}

/** 012 180 01234567890 1 → agrupado para leerse fácil. */
export function formatClabe(value: string) {
  const c = cleanClabe(value);
  return [c.slice(0, 3), c.slice(3, 6), c.slice(6, 17), c.slice(17)].filter(Boolean).join(' ');
}

export function maskClabe(value: string) {
  const c = cleanClabe(value);
  return c.length === 18 ? `•••• ${c.slice(-4)}` : '—';
}
