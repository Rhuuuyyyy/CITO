const db = supabase.createClient(
  'https://znrsznscbmtudbcueana.supabase.co',
  'sb_publishable_-qtbzxprwWLKtjDyxFNFqA_lQSsuFj1'
);

function encodeNome(nome) {
  if (!nome) return '\\x';
  const bytes = new TextEncoder().encode(nome);
  return '\\x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function decodeNome(valor) {
  if (!valor || typeof valor !== 'string') return '';
  if (valor.startsWith('\\x')) {
    const hex = valor.slice(2);
    if (!hex) return '';
    try {
      const bytes = new Uint8Array(hex.match(/.{2}/g).map(b => parseInt(b, 16)));
      return new TextDecoder().decode(bytes);
    } catch { return ''; }
  }
  try {
    const binary = atob(valor);
    return new TextDecoder().decode(new Uint8Array([...binary].map(c => c.charCodeAt(0))));
  } catch { return valor; }
}

async function hashCpf(cpf) {
  const digits = (cpf || '').replace(/\D/g, '');
  if (digits.length !== 11) return null;
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(digits));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
