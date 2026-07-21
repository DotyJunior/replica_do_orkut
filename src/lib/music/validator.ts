/**
 * Módulo de segurança para a biblioteca de música.
 * Garante que apenas URLs seguras sejam aceitas e evita injeção.
 */

export const validateMusicUrl = (url: string): string | null => {
  // Implementação futura: validar contra uma whitelist de domínios (Spotify, SoundCloud, etc.)
  // e garantir que é uma string pura sem tags HTML/JS.
  
  if (typeof url !== 'string' || !url.startsWith('https://')) {
    return null;
  }
  
  // Exemplo básico: evitar injeção óbvia
  const forbiddenChars = /[<>"']/g;
  if (forbiddenChars.test(url)) {
    return null;
  }
  
  return url;
};
