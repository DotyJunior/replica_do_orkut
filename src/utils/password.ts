export interface PasswordStrengthResult {
  score: 0 | 1 | 2 | 3;
  label: 'Bloqueada' | 'Fraca' | 'Média' | 'Forte';
  progressBar: string; // e.g. "[■■□□□□□□□□]"
  helpMessage: string;
  isValidToSubmit: boolean;
}

export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  if (!password) {
    return {
      score: 1,
      label: 'Fraca',
      progressBar: '[■■□□□□□□□□]',
      helpMessage: 'Digite uma senha de segurança para analisar.',
      isValidToSubmit: false,
    };
  }

  const lowered = password.toLowerCase();

  // List of leaked/common passwords to block
  const blocklist = [
    "123456",
    "12345678",
    "123456789",
    "password",
    "qwerty",
    "admin",
    "senha",
    "senha123"
  ];

  if (blocklist.includes(lowered)) {
    return {
      score: 0,
      label: 'Bloqueada',
      progressBar: '[□□□□□□□□□□]',
      helpMessage: '⚠ Senha extremamente comum e vulnerável. Por favor, escolha outra senha.',
      isValidToSubmit: false,
    };
  }

  // Regex testers
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%&*?_\-]/.test(password); // ! @ # $ % & * ? _ -
  const hasLetter = /[a-zA-Z]/.test(password);

  // Requisitos mínimos:
  // - Mínimo de 8 caracteres.
  // - Pelo menos 1 letra.
  // - Pelo menos 1 número.
  const meetsMinRequirement = password.length >= 8 && hasLetter && hasNumber;

  // Classificação Forte:
  // - Mínimo de 12 caracteres.
  // - Possui: letras maiúsculas, letras minúsculas, números e caracteres especiais.
  const isStrong = password.length >= 12 && hasUppercase && hasLowercase && hasNumber && hasSpecial;

  // Classificação Fraca:
  // - Menos de 8 caracteres OR apenas letras OR apenas números
  const isOnlyLetters = hasLetter && !hasNumber && !hasSpecial;
  const isOnlyNumbers = !hasLetter && hasNumber && !hasSpecial;
  const isWeak = password.length < 8 || isOnlyLetters || isOnlyNumbers;

  if (isStrong) {
    return {
      score: 3,
      label: 'Forte',
      progressBar: '[■■■■■■■■■■]',
      helpMessage: '🛡 Senha forte. Sua conta estará melhor protegida contra tentativas de invasão.',
      isValidToSubmit: meetsMinRequirement,
    };
  }

  if (meetsMinRequirement && !isWeak) {
    return {
      score: 2,
      label: 'Média',
      progressBar: '[■■■■■□□□□□]',
      helpMessage: 'Sua senha é média. Adicione letras maiúsculas, minúsculas e símbolos especiais para torná-la forte.',
      isValidToSubmit: meetsMinRequirement,
    };
  }

  // Fallback to Weak
  return {
    score: 1,
    label: 'Fraca',
    progressBar: '[■■□□□□□□□□]',
    helpMessage: '⚠ Sua senha é considerada fraca. Adicione letras maiúsculas, minúsculas, números e símbolos especiais.',
    isValidToSubmit: meetsMinRequirement,
  };
}
