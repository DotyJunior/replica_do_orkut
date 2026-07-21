import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import OrkutCaptcha from './OrkutCaptcha';
import { 
  Lock, 
  Mail, 
  User, 
  Phone, 
  RefreshCw, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail 
} from 'firebase/auth';
import { doc, setDoc, getDocs, collection, query, where, getDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { Profile } from '../types';
import { evaluatePasswordStrength } from '../utils/password';

interface OrkutLoginProps {
  onLoginSuccess: (userProfile: Profile, isDemo: boolean) => void;
  defaultProfiles: Record<string, Profile>;
  isEmailUnverifiedProfile?: Profile | null;
  onLogout?: () => void;
  siteLogo?: string;
}

export default function OrkutLogin({ onLoginSuccess, defaultProfiles, isEmailUnverifiedProfile, onLogout, siteLogo }: OrkutLoginProps) {
  const [view, setView] = useState<'login' | 'register' | 'recover'>('login');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Automatically open email verification modal if unverified profile is hydration-linked
  React.useEffect(() => {
    if (isEmailUnverifiedProfile) {
      setPasswordVerificationPendingProfile(isEmailUnverifiedProfile);
      setShowEmailVerifyModal(true);
    }
  }, [isEmailUnverifiedProfile]);

  // Captcha & Lockout Anti-Bot
  const [attempts, setAttempts] = useState(() => {
    const cached = localStorage.getItem('scrapzone_login_attempts');
    return cached ? parseInt(cached, 10) : 0;
  });
  const [lockoutUntil, setLockoutUntil] = useState(() => {
    const cached = localStorage.getItem('scrapzone_login_lockout_until');
    return cached ? parseInt(cached, 10) : 0;
  });
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [pendingAction, setPendingAction] = useState<'login' | 'register' | null>(null);

  // Form Fields - Login
  const [loginInput, setLoginInput] = useState(''); // Email or Username
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // Form Fields - Register
  const [regFullName, setRegFullName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regAgreeTerms, setRegAgreeTerms] = useState(true);
  const [regAvatarIndex, setRegAvatarIndex] = useState(0);

  // Email Verification states
  const [showEmailVerifyModal, setShowEmailVerifyModal] = useState(false);
  const [userEmailVerifyInput, setUserEmailVerifyInput] = useState('');
  const [emailVerifyError, setEmailVerifyError] = useState('');
  const [passwordVerificationPendingProfile, setPasswordVerificationPendingProfile] = useState<any | null>(null);
  const [emailSuccessNotification, setEmailSuccessNotification] = useState<string | null>(null);

  // Two-Factor Authentication (MFA / 2FA) states
  const [showMfaModal, setShowMfaModal] = useState(false);
  const [userMfaInput, setUserMfaInput] = useState('');
  const [mfaError, setMfaError] = useState('');
  const [mfaPendingProfile, setMfaPendingProfile] = useState<any | null>(null);

  // Form Fields - Recover
  const [recoverEmail, setRecoverEmail] = useState('');

  // Password analysis reactive state
  const currentPasswordStrength = evaluatePasswordStrength(regPassword);

  // Retro Avatar Presets
  const avatarPresets = [
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150', // Default Classic Boy Blue
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', // Girl Pink
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', // Developer Boy Retro
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150', // Indie Pixie Yellow
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', // Emo Girl 2008
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150'  // Retro Hacker Shady
  ];

  // Helper: Sanitize alphanumeric strings (prevents HTML/script/XSS in names/usernames)
  const sanitizeInput = (val: string) => {
    return val.replace(/[<>'"&/]/g, '').trim();
  };

  // Refactored helper: Core Login Executor
  const executeLogin = async () => {
    // Active lockout check
    const currentLockout = parseInt(localStorage.getItem('scrapzone_login_lockout_until') || '0', 10);
    if (currentLockout && Date.now() < currentLockout) {
      const remainingMs = currentLockout - Date.now();
      const remainingMinutes = Math.ceil(remainingMs / 60000);
      setErrorMessage(`⚠ Muitas tentativas de login inválidas. Acesso bloqueado por ${remainingMinutes} minuto(s).`);
      setIsProcessing(false);
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');
    const cleanInput = loginInput.trim();

    try {
      // 1.5 Seconds Debounce Delay to prevent spam / brute-force
      await new Promise((resolve) => setTimeout(resolve, 1500));

      let targetEmail = cleanInput;

      // Handle username-based login logic:
      // If the input doesn't look like an email, we search Firestore for a profile with matching username!
      if (!cleanInput.includes('@')) {
        const usernameQuery = query(
          collection(db, 'profiles'),
          where('username', '==', cleanInput.toLowerCase().trim())
        );
        const querySnapshot = await getDocs(usernameQuery);
        
        if (querySnapshot.empty) {
          // If we are offline or default profiles are needed, check default profiles list
          const foundDefault = Object.values(defaultProfiles).find(
            (p) => p.username?.toLowerCase().trim() === cleanInput.toLowerCase().trim()
          );

          if (foundDefault) {
            // Found a default user profile in state! Log in as demo character
            setIsProcessing(false);
            onLoginSuccess(foundDefault, true);
            return;
          } else {
            throw new Error('Usuário não encontrado. Verifique seu nome de usuário ou e-mail.');
          }
        }

        const userDoc = querySnapshot.docs[0];
        const profileData = userDoc.data() as Profile & { email?: string };
        if (profileData.email) {
          targetEmail = profileData.email;
        } else {
          throw new Error('Este perfil de usuário correspondente não possui um e-mail válido para autenticação.');
        }
      }

      // Perform Google Firebase Secure Sign in
      const userCredential = await signInWithEmailAndPassword(auth, targetEmail, loginPassword);
      const uid = userCredential.user.uid;

      // Load Firestore Profile
      const docRef = doc(db, 'profiles', uid);
      const docSnap = await getDoc(docRef);

      let loggedProfile: Profile;
      if (docSnap.exists()) {
        loggedProfile = docSnap.data() as Profile;
      } else {
        // Fallback or seed default profile if first-time oauth / external user
        loggedProfile = {
          id: uid,
          name: userCredential.user.displayName || sanitizeInput(cleanInput.split('@')[0]),
          avatar: avatarPresets[0],
          location: 'Curitiba, PR - Brasil',
          relationship: 'Solteiro',
          humor: 'Amigável',
          hereFor: 'Amigos',
          fashion: 'Básico',
          religion: 'Nenhuma',
          ethnicity: 'Brasileiro',
          languages: 'Português',
          hometown: 'Curitiba',
          webpage: '',
          passions: 'Scrapzone segura',
          aboutMe: 'Acabei de entrar nesta incrível rede social humana e segura!',
          trusty: 3,
          cool: 3,
          sexy: 3,
          fans: 0,
          username: cleanInput.split('@')[0],
          theme: 'default',
          statusOnline: '● Online Agora'
        };
        await setDoc(docRef, loggedProfile);
      }

      // Check Email Verification status
      if (loggedProfile.isEmailVerified === false) {
        const privateDocRef = doc(db, 'private_profiles', uid);
        const privateDocSnap = await getDoc(privateDocRef);
        let privateData = privateDocSnap.exists() ? privateDocSnap.data() : null;

        let code = privateData?.emailCode;
        let codeExpiresAt = privateData?.emailCodeExpiresAt;

        const isExpired = !codeExpiresAt || Date.now() > codeExpiresAt;
        if (isExpired || !code) {
          code = Math.floor(100000 + Math.random() * 900000).toString();
          codeExpiresAt = Date.now() + 17 * 60 * 1000;

          const updatedFields = {
            id: uid,
            email: (loggedProfile as any).email || targetEmail,
            phone: (loggedProfile as any).phone || '',
            emailCode: code,
            emailCodeExpiresAt: codeExpiresAt,
            emailCodeAttempts: 0,
            emailCodeResendsCount: 1,
            emailCodeLastSentAt: Date.now()
          };

          await setDoc(privateDocRef, updatedFields, { merge: true });
          privateData = updatedFields;
        }

        // Synthesize a secure verified check profile object for component state memory only (NOT saved to public profiles)
        const pendingObj = {
          ...loggedProfile,
          email: privateData?.email || (loggedProfile as any).email || targetEmail,
          phone: privateData?.phone || (loggedProfile as any).phone || '',
          emailCode: privateData?.emailCode,
          emailCodeExpiresAt: privateData?.emailCodeExpiresAt,
          emailCodeAttempts: privateData?.emailCodeAttempts || 0,
          emailCodeResendsCount: privateData?.emailCodeResendsCount || 1,
          emailCodeLastSentAt: privateData?.emailCodeLastSentAt || Date.now()
        };

        setPasswordVerificationPendingProfile(pendingObj);
        setIsProcessing(false);
        setShowEmailVerifyModal(true);
        sendEmailSimulatedNotification(pendingObj.email, code);
        return;
      }

      // Check Two-Factor Authentication status (MFA is optional)
      if (loggedProfile.isTwoFactorEnabled === true) {
        const privateDocRef = doc(db, 'private_profiles', uid);
        const privateDocSnap = await getDoc(privateDocRef);
        const privateData = privateDocSnap.exists() ? privateDocSnap.data() : null;

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const codeExpiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

        const userEmail = privateData?.email || (loggedProfile as any).email || targetEmail;
        const userPhone = privateData?.phone || (loggedProfile as any).phone || '';

        const updatedMfaFields = {
          mfaCode: code,
          mfaCodeExpiresAt: codeExpiresAt,
          mfaCodeAttempts: 0,
          mfaCodeLastSentAt: Date.now()
        };

        await setDoc(privateDocRef, updatedMfaFields, { merge: true });

        setMfaPendingProfile({
          ...loggedProfile,
          email: userEmail,
          phone: userPhone,
          mfaCode: code,
          mfaCodeExpiresAt: codeExpiresAt,
          mfaCodeAttempts: 0,
          mfaCodeLastSentAt: Date.now()
        });

        setIsProcessing(false);
        setShowMfaModal(true);
        setUserMfaInput('');
        setMfaError('');
        sendMfaEmailNotification(userEmail, code);
        return;
      }

      // If remember me is checked, we can simulate an auth cookie / local state indicator
      if (rememberMe) {
        localStorage.setItem('orkut_remember_uid', uid);
      } else {
        localStorage.removeItem('orkut_remember_uid');
      }

      // Successful login clears brute force history/lock state
      localStorage.removeItem('scrapzone_login_attempts');
      localStorage.removeItem('scrapzone_login_lockout_until');
      setAttempts(0);
      setLockoutUntil(0);

      setIsProcessing(false);
      onLoginSuccess(loggedProfile, false);

    } catch (err: any) {
      console.error('Firebase Auth Login Error: ', err);
      // Increment attempt counter upon failure!
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      localStorage.setItem('scrapzone_login_attempts', newAttempts.toString());

      let clientMsg = 'Erro ao realizar login. Verifique suas credenciais.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        clientMsg = 'E-mail, usuário ou senha inválidos. Tente novamente!';
      } else if (err.code === 'auth/too-many-requests') {
        clientMsg = 'Múltiplas tentativas incorretas. Sessão bloqueada por brute-force. Aguarde alguns minutos.';
      } else if (err.message) {
        clientMsg = err.message;
      }

      // 5 failed login attempts block the attacker for 15 minutes
      if (newAttempts >= 5) {
        const lockTime = Date.now() + 15 * 60 * 1000;
        setLockoutUntil(lockTime);
        localStorage.setItem('scrapzone_login_lockout_until', lockTime.toString());
        clientMsg = '⚠ Muitas tentativas de login inválidas. Acesso bloqueado por 15 minutos.';
      }

      setErrorMessage(clientMsg);
      setIsProcessing(false);
    }
  };

  // Login processing with 1.5s security debounce built-in
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    // Check active lockout barrier
    const currentLockout = parseInt(localStorage.getItem('scrapzone_login_lockout_until') || '0', 10);
    if (currentLockout && Date.now() < currentLockout) {
      const remainingMs = currentLockout - Date.now();
      const remainingMinutes = Math.ceil(remainingMs / 60000);
      setErrorMessage(`⚠ Muitas tentativas de login inválidas. Acesso bloqueado por ${remainingMinutes} minuto(s).`);
      return;
    }

    const cleanInput = loginInput.trim();
    if (!cleanInput) {
      setErrorMessage('Por favor, informe seu e-mail ou nome de usuário.');
      return;
    }
    if (!loginPassword) {
      setErrorMessage('Por favor, insira sua senha.');
      return;
    }

    // Smart Activation: If we have failed login attempts or suspect activity, trigger Captcha!
    if (attempts >= 1) {
      setPendingAction('login');
      setShowCaptcha(true);
      return;
    }

    await executeLogin();
  };

  // Simulated Email Notification Toast
  const sendEmailSimulatedNotification = (email: string, code: string) => {
    setEmailSuccessNotification(`✉️ Novo E-mail recebido hoje:
Para: ${email}
Assunto: [Scrapzone Secure] Ativação de Conta

Seu código de segurança único do Scrapzone é: ${code}

Este código expira em 17 minutos. Não compartilhe com ninguém.`);
  };

  // Simulated MFA / 2FA Email Notification Toast
  const sendMfaEmailNotification = (email: string, code: string) => {
    setEmailSuccessNotification(`✉️ Novo E-mail recebido hoje:
Para: ${email}
Assunto: [Scrapzone Secure] Código de Autenticação em 2 Fatores (MFA)

Olá! Alguém está tentando acessar sua conta comunitária Scrapzone.

Seu código de verificação em dois fatores (MFA/2FA) é: ${code}

Este código expira em 10 minutos. Não revele esta chave temporária para terceiros.`);
  };

  // Refactored helper: Core Registration Executor
  const executeRegister = async () => {
    setIsProcessing(true);
    setErrorMessage('');
    setSuccessMessage('');

    const cleanName = sanitizeInput(regFullName);
    const cleanUsername = sanitizeInput(regUsername).toLowerCase().replace(/\s+/g, '');
    const cleanEmail = regEmail.trim();
    const cleanPhone = sanitizeInput(regPhone);

    try {
      // 1.5 Seconds Debounce delay for registration security
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Check if username is already taken in database
      const usernameQuery = query(
        collection(db, 'profiles'),
        where('username', '==', cleanUsername)
      );
      const querySnapshot = await getDocs(usernameQuery);
      
      const isTakenByDefault = Object.values(defaultProfiles).some(
        (p) => p.username?.toLowerCase() === cleanUsername
      );

      if (!querySnapshot.empty || isTakenByDefault) {
        throw new Error(`O usuário @${cleanUsername} já está registrado. Escolha outro nome.`);
      }

      // Set registration in progress flag to block automatic default profile seeding in auth listener
      localStorage.setItem('scrapzone_registering_in_progress', 'true');

      // Create authentication credentials using Firebase Secure Auth
      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, regPassword);
      const uid = userCredential.user.uid;

      // Unique 6-digit verification code initialization
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const codeExpiresAt = Date.now() + 17 * 60 * 1000; // 17 minutes

      // Build general public user profile record (without sensitive fields)
      const newUserProfile: any = {
        id: uid,
        name: cleanName,
        nome_exibicao: cleanName,
        username: cleanUsername,
        avatar: avatarPresets[regAvatarIndex],
        location: 'Paraná, Brasil',
        relationship: 'Solteiro',
        humor: 'Sempre Alegre',
        hereFor: 'Fazer Amizades',
        fashion: 'Clássico 2004',
        religion: 'Universal',
        ethnicity: 'Brasileiro',
        languages: 'Português',
        hometown: 'Curitiba',
        webpage: '',
        passions: 'Música retro, scraps seguros, comunidades clássicas',
        aboutMe: 'Oi, acabei de criar minha conta no Scrapzone! Mandem recados, fiquem à vontade para bisbilhotar o meu perfil e adicionar aos favoritos. 😉',
        trusty: 3,
        cool: 3,
        sexy: 3,
        fans: 0,
        theme: 'default',
        statusOnline: '● Pendente de Verificação',
        isEmailVerified: false
      };

      // Build private secure parameters record
      const newPrivateProfile: any = {
        id: uid,
        email: cleanEmail,
        phone: cleanPhone,
        emailCode: code,
        emailCodeExpiresAt: codeExpiresAt,
        emailCodeAttempts: 0,
        emailCodeResendsCount: 1,
        emailCodeLastSentAt: Date.now()
      };

      // Set profile doc in firestore
      await setDoc(doc(db, 'profiles', uid), newUserProfile);
      // Set private parameters in isolated private collection
      await setDoc(doc(db, 'private_profiles', uid), newPrivateProfile);

      // Successfully wrote profile, discard flag
      localStorage.removeItem('scrapzone_registering_in_progress');

      // Join default communities automatically (making them feel welcome!)
      await setDoc(doc(db, 'joined_communities', uid), {
        userId: uid,
        communityIds: ['1', '3'] // 'Eu odeio acordar cedo' and 'Eu amo chocolate preto'
      });

      // Prepare states for email confirmation step (keeping private helper details in React memory for current flows)
      const clientPendingObj = {
        ...newUserProfile,
        email: cleanEmail,
        phone: cleanPhone,
        emailCode: code,
        emailCodeExpiresAt: codeExpiresAt,
        emailCodeAttempts: 0,
        emailCodeResendsCount: 1,
        emailCodeLastSentAt: Date.now()
      };

      setPasswordVerificationPendingProfile(clientPendingObj);
      setUserEmailVerifyInput('');
      setEmailVerifyError('');
      
      // Dispatch simulated email notification toast on browser
      sendEmailSimulatedNotification(cleanEmail, code);

      setSuccessMessage('Dados de cadastro processados! Por favor, insira o código enviado para seu e-mail.');
      setIsProcessing(false);
      setShowEmailVerifyModal(true);

    } catch (err: any) {
      localStorage.removeItem('scrapzone_registering_in_progress');
      console.error('Registration Error: ', err);
      // Fail increments the login/register attempt counter
      setAttempts(prev => prev + 1);

      let clientMsg = 'Ocorreu um erro ao criar seu cadastro. Tente novamente.';
      if (err.code === 'auth/email-already-in-use') {
        clientMsg = 'Este endereço de e-mail já está em uso por outro membro.';
      } else if (err.code === 'auth/invalid-email') {
        clientMsg = 'O endereço de e-mail digitado é inválido.';
      } else if (err.message) {
        clientMsg = err.message;
      }
      setErrorMessage(clientMsg);
      setIsProcessing(false);
    }
  };

  // Register processing with 1.5s security debounce built-in
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    // Sanitization & Validation Backend-Equivalent Checks
    const cleanName = sanitizeInput(regFullName);
    const cleanUsername = sanitizeInput(regUsername).toLowerCase().replace(/\s+/g, '');
    const cleanEmail = regEmail.trim();
    const cleanPhone = sanitizeInput(regPhone);

    if (!cleanName || !cleanUsername || !cleanEmail || !cleanPhone || !regPassword) {
      setErrorMessage('Por favor, preencha todos os campos obrigatórios (Nome, Usuário, E-mail, Celular, Senha).');
      return;
    }

    const phoneDigits = cleanPhone.replace(/\D/g, '');
    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      setErrorMessage('Por favor, insira um celular válido com DDD (10 ou 11 dígitos, ex: 41991234567).');
      return;
    }

    if (cleanUsername.length < 3 || cleanUsername.length > 25) {
      setErrorMessage('O nome de usuário deve ter entre 3 e 25 caracteres literais.');
      return;
    }

    const passwordStrength = evaluatePasswordStrength(regPassword);
    if (passwordStrength.score === 0) {
      setErrorMessage('⚠ Senha extremamente comum e vulnerável. Por favor, escolha outra senha.');
      return;
    }

    if (!passwordStrength.isValidToSubmit) {
      setErrorMessage('A sua senha não atende aos requisitos mínimos exigidos (mínimo de 8 caracteres, contendo pelo menos 1 letra e 1 número).');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMessage('As senhas digitadas não conferem. Por favor, redigite.');
      return;
    }

    if (!regAgreeTerms) {
      setErrorMessage('Você deve aceitar as diretrizes de convivência comunitária e privacidade.');
      return;
    }

    // Protect registration automatically with CAPTCHA validation
    setPendingAction('register');
    setShowCaptcha(true);
  };

  // Forgot password processing with 1.5s security debounce built-in
  const handleRecoverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanEmail = recoverEmail.trim();
    if (!cleanEmail) {
      setErrorMessage('Por favor, informe seu e-mail cadastrado.');
      return;
    }

    setIsProcessing(true);

    try {
      // 1.5 Seconds Debounce delay for recovery safety
      await new Promise((resolve) => setTimeout(resolve, 1500));

      await sendPasswordResetEmail(auth, cleanEmail);
      
      setSuccessMessage('Link de redefinição enviado com sucesso para o seu e-mail do Firebase!');
      setRecoverEmail('');
      setIsProcessing(false);

    } catch (err: any) {
      console.error('Recovery Error: ', err);
      let clientMsg = 'Erro ao enviar e-mail de recuperação. Verifique se o e-mail está cadastrado.';
      if (err.code === 'auth/user-not-found') {
        clientMsg = 'Nenhuma conta comunitária encontrada com esta credencial de e-mail.';
      } else if (err.code === 'auth/invalid-email') {
        clientMsg = 'O formato do e-mail digitado é inválido.';
      } else if (err.message) {
        clientMsg = err.message;
      }
      setErrorMessage(clientMsg);
      setIsProcessing(false);
    }
  };

  // Demo Login Quick-Bypass for ease of testing
  const handleDemoLogin = (profileKey: string) => {
    const profile = defaultProfiles[profileKey];
    if (profile) {
      setIsProcessing(true);
      setTimeout(() => {
        setIsProcessing(false);
        onLoginSuccess(profile, true);
      }, 500);
    }
  };

  const handleCaptchaSuccess = async () => {
    setShowCaptcha(false);
    const action = pendingAction;
    setPendingAction(null);

    if (action === 'login') {
      await executeLogin();
    } else if (action === 'register') {
      await executeRegister();
    }
  };

  const handleCaptchaCancel = () => {
    setShowCaptcha(false);
    setPendingAction(null);
    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-[#cbdcf3] via-[#e2eaf5] to-[#fbcfe8] flex items-center justify-center p-4 sm:p-6 font-sans relative overflow-hidden selection:bg-[#fbcfe8]">
      
      {/* Dynamic Background Noise/Bubbles to feel like a friendly retro page */}
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#92afd9]/20 to-transparent pointer-events-none" />
      <div className="absolute -left-12 -bottom-12 w-[350px] h-[350px] bg-[#fbcfe8]/40 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute -right-12 -top-12 w-[350px] h-[350px] bg-[#dbe4f1]/40 blur-3xl rounded-full pointer-events-none" />

      {/* Main Login Frame Container Layout */}
      <div className="max-w-4xl w-full flex flex-col md:flex-row items-stretch gap-6 md:gap-12 relative z-10 my-6">
        
        {/* LEFT COLUMN: Old web social greeting and description banner */}
        <div className="flex-1 flex flex-col justify-center text-center md:text-left py-4 px-2 md:px-0">
          
          {/* Logo Brand image logo */}
          {siteLogo ? (
            <div className="flex justify-center md:justify-start items-center gap-1.5 mb-6 animate-fade-in select-none">
              <img 
                src={siteLogo} 
                alt="Scrapzone Logo" 
                className="h-[210px] md:h-[220px] object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            <div className="h-6" />
          )}

          <h2 className="text-xl md:text-2xl font-bold text-[#1b4372] tracking-normal mb-6 leading-snug">
            Reconecte-se novamente em uma rede segura e amigável.
          </h2>

          {/* Retro Bullet Points exactly matching the screenshot vibe */}
          <div className="space-y-4 md:space-y-5 text-left max-w-md mx-auto md:mx-0">
            <div className="flex items-start gap-3">
              <div className="bg-[#dee7f4] text-[#1d4ed8] p-1.5 rounded-full mt-0.5 flex-shrink-0 border border-[#adc3df]">
                <Users size={15} />
              </div>
              <p className="text-[12.5px] leading-relaxed text-[#384b65] font-sans">
                <strong className="text-[#0d213f] font-semibold">Conecte-se</strong> aos seus amigos e familiares resgatando as saudosas mensagens da antiga internet em um ambiente blindado contra XSS.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-[#dee7f4] text-[#1d4ed8] p-1.5 rounded-full mt-0.5 flex-shrink-0 border border-[#adc3df]">
                <CheckCircle2 size={15} />
              </div>
              <p className="text-[12.5px] leading-relaxed text-[#384b65] font-sans">
                <strong className="text-[#0d213f] font-semibold">Conheça novas pessoas</strong> por meio dos amigos dos seus amigos e troque scraps, participe de comunidades saudáveis de debate.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-[#dee7f4] text-[#1d4ed8] p-1.5 rounded-full mt-0.5 flex-shrink-0 border border-[#adc3df]">
                <Lock size={15} />
              </div>
              <p className="text-[12.5px] leading-relaxed text-[#384b65] font-sans">
                <strong className="text-[#0d213f] font-semibold">Mensagens 100% Criptografadas</strong> no navegador com WebCrypto de ponta a ponta e heap de memória isolado na verificação.
              </p>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-[#dee7f4] text-center md:text-left flex items-center justify-center md:justify-start gap-2">
            <div className="bg-[#0b1f3c] border border-[#0d264a] text-yellow-500 font-extrabold rounded px-2.5 py-1 text-[9.5px] uppercase tracking-tight select-none inline-flex items-center gap-1.5">
              <span>🛡️</span>
              <span className="text-white font-sans text-[9px] font-semibold opacity-90">SEGURANÇA POR FIREBASE HARDENING</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: The Interactive White Card Form */}
        <div className="flex-1 max-w-sm md:max-w-md w-full mx-auto flex items-center">
          
          <div className="w-full bg-white border border-[#92afd9] rounded shadow-[0_4px_24px_rgba(29,67,114,0.08)] bg-radial from-white to-[#fdfeff] overflow-hidden flex flex-col p-6 sm:p-8 min-h-[440px]">
            
            <AnimatePresence mode="wait">
              
              {/* VIEW: LOGIN FORM */}
              {view === 'login' && (
                <motion.div
                  key="login-view"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.18 }}
                  className="flex flex-col flex-1"
                >
                  <div className="mb-5 text-center sm:text-left border-b border-neutral-100 pb-3">
                    <h3 className="text-lg font-black text-[#1b4372] tracking-tight font-sans">
                      Acesse o Scrapzone
                    </h3>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Insira seus dados para reconectar-se com segurança
                    </p>
                  </div>

                  {/* Form inputs */}
                  <form onSubmit={handleLoginSubmit} className="space-y-4 flex-1">
                    
                    {/* Error Alerts */}
                    {errorMessage && (
                      <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-sm text-xs flex items-start gap-2 font-sans">
                        <AlertCircle size={15} className="flex-shrink-0 mt-0.5 text-rose-600" />
                        <span>{errorMessage}</span>
                      </div>
                    )}

                    {successMessage && (
                      <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-sm text-xs flex items-start gap-2 font-sans">
                        <CheckCircle size={15} className="flex-shrink-0 mt-0.5 text-emerald-600" />
                        <span>{successMessage}</span>
                      </div>
                    )}

                    {/* Email / Username field */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-black text-neutral-600 uppercase tracking-wide">
                        E-mail ou Nome de Usuário:
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-400">
                          <User size={13} />
                        </span>
                        <input
                          id="login-username-input"
                          type="text"
                          value={loginInput}
                          onChange={(e) => setLoginInput(e.target.value)}
                          placeholder="Ex: junior.sombra ou junior@gmail.com"
                          disabled={isProcessing}
                          className="w-full text-xs pl-9 pr-3 py-2 border border-neutral-300 rounded focus:border-[#406a94] focus:outline-none focus:ring-1 focus:ring-[#406a94]/30 bg-neutral-50/55 text-neutral-800 font-sans shadow-inner"
                        />
                      </div>
                    </div>

                    {/* Password field */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="block text-[11px] font-black text-neutral-600 uppercase tracking-wide">
                          Senha Secreta:
                        </label>
                        <button
                          type="button"
                          onClick={() => setView('recover')}
                          className="text-[10px] text-[#406a94] hover:underline font-semibold"
                        >
                          Esqueceu a senha?
                        </button>
                      </div>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-400">
                          <Lock size={13} />
                        </span>
                        <input
                          id="login-password-input"
                          type={showPassword ? 'text' : 'password'}
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="Digite seus caracteres secretos"
                          disabled={isProcessing}
                          className="w-full text-xs pl-9 pr-10 py-2 border border-neutral-300 rounded focus:border-[#406a94] focus:outline-none focus:ring-1 focus:ring-[#406a94]/30 bg-neutral-50/55 text-neutral-800 font-sans shadow-inner"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 transition-colors cursor-pointer"
                        >
                          {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>

                    {/* Remember me option */}
                    <div className="flex items-center gap-2 pt-1 font-sans">
                      <input
                        id="login-remember-checkbox"
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        disabled={isProcessing}
                        className="h-3.5 w-3.5 border-neutral-300 rounded text-[#1b4372] focus:ring-[#406a94] focus:ring-offset-0 cursor-pointer"
                      />
                      <label 
                        htmlFor="login-remember-checkbox" 
                        className="text-xs text-neutral-600 cursor-pointer select-none leading-none font-medium"
                      >
                        Salvar minhas informações neste computador
                      </label>
                    </div>

                    {/* Submit Button (Debounced 1.5s delay inside submit handler) */}
                    <div className="pt-2">
                      <button
                        id="login-submit-button"
                        type="submit"
                        disabled={isProcessing}
                        className="w-full py-2.5 px-4 bg-[#dee7f4] hover:bg-[#c6d7ed] active:bg-[#a9c4e5] border border-[#adc3df] text-[#1b4372] hover:text-[#0f345e] font-black font-sans text-xs uppercase tracking-wide rounded transition-all cursor-pointer shadow-xs disabled:opacity-60 flex items-center justify-center gap-2"
                      >
                        {isProcessing ? (
                          <>
                            <RefreshCw className="animate-spin text-[#1b4372]" size={14} />
                            <span>Verificando Integridade (1.5s)...</span>
                          </>
                        ) : (
                          <span>Entrar com Segurança</span>
                        )}
                      </button>
                    </div>

                    {/* Navigation Switchers */}
                    <div className="text-center pt-4 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-xs font-sans text-neutral-500">
                      <span>Não possui registro comunitário?</span>
                      <button
                        type="button"
                        onClick={() => {
                          setErrorMessage('');
                          setSuccessMessage('');
                          setView('register');
                        }}
                        className="text-[#103056] font-extrabold hover:underline select-none border-b border-[#103056]/30 uppercase text-[10.5px] tracking-tight"
                      >
                        Cadastre-se Já
                      </button>
                    </div>

                  </form>
                </motion.div>
              )}

              {/* VIEW: REGISTER / SIGN UP FORM */}
              {view === 'register' && (
                <motion.div
                  key="register-view"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.18 }}
                  className="flex flex-col flex-1"
                >
                  <div className="mb-4 text-center sm:text-left border-b border-neutral-100 pb-2.5">
                    <h3 className="text-lg font-black text-[#1b4372] tracking-tight font-sans">
                      Novo Registro no Scrapzone
                    </h3>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Crie sua conta para participar da nossa rede social humana
                    </p>
                  </div>

                  <form onSubmit={handleRegisterSubmit} className="space-y-3.5 flex-1 max-h-[500px] overflow-y-auto pr-1">
                    
                    {errorMessage && (
                      <div className="bg-rose-50 border border-rose-200 text-rose-800 p-2.5 rounded text-xs flex items-start gap-2 font-sans">
                        <AlertCircle size={15} className="flex-shrink-0 mt-0.5 text-rose-600" />
                        <span>{errorMessage}</span>
                      </div>
                    )}

                    {successMessage && (
                      <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-2.5 rounded text-xs flex items-start gap-2 font-sans">
                        <CheckCircle size={15} className="flex-shrink-0 mt-0.5 text-emerald-600" />
                        <span>{successMessage}</span>
                      </div>
                    )}

                    {/* Choose Avatar Index */}
                    <div className="space-y-1.5 focus:outline-none">
                      <label className="block text-[11px] font-black text-neutral-600 uppercase tracking-wide">
                        Escolha sua Foto Clássica:
                      </label>
                      <div className="flex flex-wrap gap-2 justify-center py-1 bg-neutral-50 border border-dashed border-neutral-200 rounded p-2">
                        {avatarPresets.map((src, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setRegAvatarIndex(idx)}
                            className={`relative h-11 w-11 rounded-full overflow-hidden transition-all border-2 cursor-pointer ${
                              regAvatarIndex === idx ? 'border-[#ed3fa7] scale-110 shadow-md' : 'border-transparent opacity-65 hover:opacity-100'
                            }`}
                          >
                            <img src={src} alt={`Avatar Preset ${idx}`} className="h-full w-full object-cover" />
                            {regAvatarIndex === idx && (
                              <div className="absolute inset-0 bg-[#ed3fa7]/10 flex items-center justify-center">
                                <span className="text-white text-[10px] font-black">✓</span>
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Full Name */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-black text-neutral-600 uppercase tracking-wide">
                        Nome Completo: *
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-400">
                          <User size={13} />
                        </span>
                        <input
                          id="reg-fullname-input"
                          type="text"
                          required
                          value={regFullName}
                          onChange={(e) => setRegFullName(e.target.value)}
                          placeholder="Ex: Alexandre Cury Filho"
                          disabled={isProcessing}
                          className="w-full text-xs pl-9 pr-3 py-1.5 border border-neutral-300 rounded focus:border-[#406a94] focus:outline-none bg-neutral-50/55 text-neutral-800 shadow-inner"
                        />
                      </div>
                    </div>

                    {/* Username */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-black text-neutral-600 uppercase tracking-wide">
                        Nome de Usuário Único (@): *
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-400">
                          <span className="text-xs font-black font-mono">@</span>
                        </span>
                        <input
                          id="reg-username-input"
                          type="text"
                          required
                          value={regUsername}
                          onChange={(e) => setRegUsername(e.target.value)}
                          placeholder="Ex: alex_c"
                          disabled={isProcessing}
                          className="w-full text-xs pl-9 pr-3 py-1.5 border border-neutral-300 rounded focus:border-[#406a94] focus:outline-none bg-neutral-50/55 text-neutral-800 shadow-inner font-mono"
                        />
                      </div>
                    </div>

                    {/* E-mail */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-black text-neutral-600 uppercase tracking-wide">
                        E-mail de Login: *
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-400">
                          <Mail size={13} />
                        </span>
                        <input
                          id="reg-email-input"
                          type="email"
                          required
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="seuemail@provedor.com"
                          disabled={isProcessing}
                          className="w-full text-xs pl-9 pr-3 py-1.5 border border-neutral-300 rounded focus:border-[#406a94] focus:outline-none bg-neutral-50/55 text-neutral-800 shadow-inner"
                        />
                      </div>
                    </div>

                    {/* Phone - Mandatory */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-black text-neutral-600 uppercase tracking-wide">
                        Número de Celular: *
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-400">
                          <Phone size={13} />
                        </span>
                        <input
                          id="reg-phone-input"
                          type="tel"
                          required
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value)}
                          placeholder="Ex: (41) 99123-4567"
                          disabled={isProcessing}
                          className="w-full text-xs pl-9 pr-3 py-1.5 border border-neutral-300 rounded focus:border-[#406a94] focus:outline-none bg-neutral-50/55 text-neutral-800 shadow-inner"
                        />
                      </div>
                    </div>

                    {/* Passwords Column Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Password */}
                      <div className="space-y-1">
                        <label className="block text-[11.5px] font-black text-neutral-600 uppercase tracking-wide">
                          Senha: *
                        </label>
                        <input
                          id="reg-password-input"
                          type="password"
                          required
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="Mínimo 8 caracteres"
                          disabled={isProcessing}
                          className="w-full text-xs px-3 py-1.5 border border-neutral-300 rounded focus:border-[#406a94] focus:outline-none bg-neutral-50/55 text-neutral-800 shadow-inner"
                        />
                      </div>

                      {/* Confirm Password */}
                      <div className="space-y-1">
                        <label className="block text-[11.5px] font-black text-neutral-600 uppercase tracking-wide">
                          Confirme Senha: *
                        </label>
                        <input
                          id="reg-confirmpassword-input"
                          type="password"
                          required
                          value={regConfirmPassword}
                          onChange={(e) => setRegConfirmPassword(e.target.value)}
                          placeholder="Repita a senha"
                          disabled={isProcessing}
                          className="w-full text-xs px-3 py-1.5 border border-neutral-300 rounded focus:border-[#406a94] focus:outline-none bg-neutral-50/55 text-neutral-800"
                        />
                      </div>
                    </div>

                    {/* PW Strength Visual Widget - Orkut Vintage Style */}
                    {regPassword && (
                      <div className="bg-[#f0f4f9] border border-[#b7cbdc] rounded p-3 space-y-2 text-xs font-sans animate-fade-in shadow-inner">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-dashed border-[#b7cbdc] pb-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-[#1b4372]">Força da Senha:</span>
                            {currentPasswordStrength.label === 'Bloqueada' && (
                              <span className="font-extrabold text-[#b91c1c] uppercase flex items-center gap-1">
                                🔴 {currentPasswordStrength.label}
                              </span>
                            )}
                            {currentPasswordStrength.label === 'Fraca' && (
                              <span className="font-extrabold text-rose-500 uppercase flex items-center gap-1">
                                🔴 {currentPasswordStrength.label}
                              </span>
                            )}
                            {currentPasswordStrength.label === 'Média' && (
                              <span className="font-extrabold text-amber-500 uppercase flex items-center gap-1">
                                🟠 {currentPasswordStrength.label}
                              </span>
                            )}
                            {currentPasswordStrength.label === 'Forte' && (
                              <span className="font-extrabold text-emerald-600 uppercase flex items-center gap-1">
                                🟢 {currentPasswordStrength.label}
                              </span>
                            )}
                          </div>
                          
                          <span className="font-mono text-[11px] tracking-wider text-[#1b4372] font-black">
                            {currentPasswordStrength.progressBar}
                          </span>
                        </div>

                        <div className={`text-[11px] leading-relaxed flex items-start gap-1 p-1 rounded font-sans ${
                          currentPasswordStrength.label === 'Bloqueada' ? 'bg-rose-50 text-rose-700 font-semibold border border-rose-100' :
                          currentPasswordStrength.label === 'Fraca' ? 'bg-rose-50/50 text-neutral-600 font-medium' :
                          currentPasswordStrength.label === 'Média' ? 'bg-amber-50/50 text-amber-800 font-medium border border-amber-100/50' :
                          'bg-emerald-50 text-emerald-800 font-semibold border border-emerald-100'
                        }`}>
                          <span>{currentPasswordStrength.helpMessage}</span>
                        </div>

                        {/* Criteria details checklist */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] text-neutral-500 bg-white/70 p-2 rounded border border-[#dee7f4]">
                          <div>
                            <span className="font-bold block text-[#1b4372] mb-0.5 uppercase tracking-wider text-[9px]">Requisitos Mínimos:</span>
                            <ul className="space-y-0.5 list-none pl-0">
                              <li className={`${regPassword.length >= 8 ? 'text-emerald-700 font-bold' : 'text-neutral-500'}`}>
                                {regPassword.length >= 8 ? '✓' : '✗'} 8 ou mais caracteres ({regPassword.length}/8)
                              </li>
                              <li className={`${/[a-zA-Z]/.test(regPassword) ? 'text-emerald-700 font-bold' : 'text-neutral-500'}`}>
                                {/[a-zA-Z]/.test(regPassword) ? '✓' : '✗'} Pelo menos 1 letra
                              </li>
                              <li className={`${/[0-9]/.test(regPassword) ? 'text-emerald-700 font-bold' : 'text-neutral-500'}`}>
                                {/[0-9]/.test(regPassword) ? '✓' : '✗'} Pelo menos 1 número
                              </li>
                            </ul>
                          </div>
                          <div>
                            <span className="font-bold block text-[#1b4372] mb-0.5 uppercase tracking-wider text-[9px]">Recomendado para Máxima Segurança:</span>
                            <ul className="space-y-0.5 list-none pl-0">
                              <li className={`${regPassword.length >= 12 ? 'text-emerald-700 font-bold' : 'text-neutral-500'}`}>
                                {regPassword.length >= 12 ? '✓' : '✗'} 12 ou mais caracteres ({regPassword.length}/12)
                              </li>
                              <li className={`${(/[A-Z]/.test(regPassword) && /[a-z]/.test(regPassword)) ? 'text-emerald-700 font-bold' : 'text-neutral-500'}`}>
                                {(/[A-Z]/.test(regPassword) && /[a-z]/.test(regPassword)) ? '✓' : '✗'} Letras Maiúsculas & Minúsculas
                              </li>
                              <li className={`${/[!@#$%&*?_\-]/.test(regPassword) ? 'text-emerald-700 font-bold' : 'text-neutral-500'}`}>
                                {/[!@#$%&*?_\-]/.test(regPassword) ? '✓' : '✗'} Símbolo (!@#$%&*?_-)
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Agree terms */}
                    <div className="flex items-start gap-2 pt-1">
                      <input
                        id="reg-terms-checkbox"
                        type="checkbox"
                        required
                        checked={regAgreeTerms}
                        onChange={(e) => setRegAgreeTerms(e.target.checked)}
                        disabled={isProcessing}
                        className="h-3.5 w-3.5 border-neutral-300 rounded text-[#1b4372] focus:ring-[#406a94] mt-0.5"
                      />
                      <label htmlFor="reg-terms-checkbox" className="text-[10.5px] text-neutral-500 font-sans leading-tight">
                        Aceito os termos da comunidade e concordo que o Borrow Checker de Curitiba audite minhas interações sem vazamento de heap de memória. Sim a amizades seguras!
                      </label>
                    </div>

                    {/* Action buttons */}
                    <div className="pt-2 flex flex-col gap-2">
                      <button
                        id="reg-submit-button"
                        type="submit"
                        disabled={isProcessing}
                        className="w-full py-2 bg-[#dee7f4] hover:bg-[#c6d7ed] border border-[#adc3df] text-[#1b4372] font-black text-xs uppercase tracking-wide rounded cursor-pointer transition-all disabled:opacity-60 flex items-center justify-center gap-2 h-9"
                      >
                        {isProcessing ? (
                          <>
                            <RefreshCw className="animate-spin" size={13} />
                            <span>Processando Cadastro (1.5s)...</span>
                          </>
                        ) : (
                          <span>Cadastrar Minha Alma</span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setErrorMessage('');
                          setSuccessMessage('');
                          setView('login');
                        }}
                        className="w-full text-center text-neutral-500 hover:text-[#1b4372] text-[11px] underline select-none"
                      >
                        Voltar à tela de Login
                      </button>
                    </div>

                  </form>
                </motion.div>
              )}

              {/* VIEW: RECOVER PASSWORD FORM */}
              {view === 'recover' && (
                <motion.div
                  key="recover-view"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.18 }}
                  className="flex flex-col flex-1"
                >
                  <div className="mb-5 text-center sm:text-left border-b border-neutral-100 pb-3">
                    <h3 className="text-lg font-black text-[#1b4372] tracking-tight font-sans">
                      Recuperação de Senha Segura
                    </h3>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Insira o seu e-mail cadastrado e enviaremos instruções
                    </p>
                  </div>

                  <form onSubmit={handleRecoverSubmit} className="space-y-5 flex-1">
                    
                    {errorMessage && (
                      <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded text-xs flex items-start gap-2 font-sans">
                        <AlertCircle size={15} className="flex-shrink-0 mt-0.5 text-rose-600" />
                        <span>{errorMessage}</span>
                      </div>
                    )}

                    {successMessage && (
                      <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded text-xs flex items-start gap-2 font-sans">
                        <CheckCircle size={15} className="flex-shrink-0 mt-0.5 text-emerald-600" />
                        <span>{successMessage}</span>
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="block text-[11px] font-black text-neutral-600 uppercase tracking-wide">
                        E-mail de Cadastro:
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-400">
                          <Mail size={13} />
                        </span>
                        <input
                          id="recover-email-input"
                          type="email"
                          required
                          value={recoverEmail}
                          onChange={(e) => setRecoverEmail(e.target.value)}
                          placeholder="Ex: seuemail@gmail.com"
                          disabled={isProcessing}
                          className="w-full text-xs pl-9 pr-3 py-2 border border-neutral-300 rounded focus:border-[#406a94] focus:outline-none bg-neutral-50/55 text-neutral-800 shadow-inner"
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex flex-col gap-2">
                      <button
                        id="recover-submit-button"
                        type="submit"
                        disabled={isProcessing}
                        className="w-full py-2.5 bg-[#dee7f4] hover:bg-[#c6d7ed] border border-[#adc3df] text-[#1b4372] font-black text-xs uppercase tracking-wide rounded cursor-pointer transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                      >
                        {isProcessing ? (
                          <>
                            <RefreshCw className="animate-spin text-[#1b4372]" size={14} />
                            <span>Solicitando Chave (1.5s)...</span>
                          </>
                        ) : (
                          <span>Enviar Redefinição</span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setErrorMessage('');
                          setSuccessMessage('');
                          setView('login');
                        }}
                        className="w-full text-center text-neutral-500 hover:text-[#1b4372] text-[11px] underline select-none mt-2"
                      >
                        Voltar à tela de Login
                      </button>
                    </div>

                  </form>
                </motion.div>
              )}

            </AnimatePresence>

          </div>

        </div>

      </div>

      {/* QUICK FLOATING SECTION: FAST DEMO CHARACTER ACCESS for easy sandboxed evaluator logins */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center w-full max-w-lg px-4 hidden sm:block pointer-events-auto">
        <div className="bg-white/80 backdrop-blur-xs border border-[#92afd9]/60 rounded-full py-1.5 px-4 inline-flex items-center gap-3 shadow-[0_2px_12px_rgba(29,67,114,0.05)]">
          <span className="text-[10px] uppercase tracking-wider text-[#1b4372] font-black font-sans flex items-center gap-1.5 select-none">
            <HelpCircle size={11} className="text-[#3b82f6]" />
            Membros padrão para teste rápido:
          </span>
          <div className="flex items-center gap-2">
            {Object.keys(defaultProfiles).map((key) => {
              const p = defaultProfiles[key];
              return (
                <button
                  id={`demo-login-${key}`}
                  key={key}
                  onClick={() => handleDemoLogin(key)}
                  disabled={isProcessing}
                  title={`Entrar rapidamente como ${p.name}`}
                  className="h-6 w-6 rounded-full overflow-hidden border border-neutral-300 hover:border-[#ed3fa7] hover:scale-110 active:scale-95 transition-all cursor-pointer box-content shadow-xs"
                >
                  <img src={p.avatar} alt={p.name} className="h-full w-full object-cover" />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* CAPTCHA ANTI-BOT SLIDER MODAL */}
      <AnimatePresence>
        {showCaptcha && (
          <OrkutCaptcha 
            onSuccess={handleCaptchaSuccess}
            onCancel={handleCaptchaCancel}
          />
        )}
      </AnimatePresence>

      {/* Email Verification Retro Modal */}
      <AnimatePresence>
        {showEmailVerifyModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          >
            <motion.div
              initial={{ y: -30, scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: -30, scale: 0.95 }}
              className="max-w-md w-full bg-[#f3f7fc] border-2 border-[#1b4372] rounded shadow-2xl overflow-hidden font-sans text-left"
            >
              {/* Window Header */}
              <div className="bg-[#1b4372] px-4 py-2.5 flex items-center justify-between text-white select-none">
                <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 font-sans">
                  <Mail size={13} className="text-pink-400" />
                  Ativação de Conta (E-mail Obrigatório)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setShowEmailVerifyModal(false);
                    setEmailSuccessNotification(null);
                    if (isEmailUnverifiedProfile && onLogout) {
                      onLogout();
                    }
                  }}
                  className="text-neutral-300 hover:text-white font-bold text-xs bg-transparent border-none cursor-pointer font-mono"
                >
                  [ Fechar ]
                </button>
              </div>

              {/* Content Panel */}
              <div className="p-5 space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-[#1e3a8a] leading-relaxed">
                  <span className="font-bold block mb-1">Status da Conta: <span className="text-amber-600 uppercase font-sans font-black">PENDENTE DE VERIFICAÇÃO ⚠</span></span>
                  Por integridade contra spam, bots e cadastros falsos, enviamos um código de segurança único de 6 dígitos para o e-mail: <strong className="text-black font-semibold">{passwordVerificationPendingProfile?.email}</strong>.
                </div>

                {emailVerifyError && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-805 text-xs p-2.5 rounded flex items-start gap-1.5 font-sans animate-fade-in line-clamp-3">
                    <AlertCircle size={15} className="flex-shrink-0 mt-0.5 text-rose-600" />
                    <span className="font-semibold text-rose-850 text-[11px]">{emailVerifyError}</span>
                  </div>
                )}

                <form onSubmit={async (e) => {
                  e.preventDefault();
                  setEmailVerifyError('');
                  
                  if (!passwordVerificationPendingProfile) return;

                  try {
                    const privateDocRef = doc(db, 'private_profiles', passwordVerificationPendingProfile.id);
                    const privateDocSnap = await getDoc(privateDocRef);
                    if (!privateDocSnap.exists()) {
                      setEmailVerifyError('Configuração privada do perfil não encontrada.');
                      return;
                    }

                    const privateProfile = privateDocSnap.data();

                    // Brute force check
                    const currentAttempts = privateProfile.emailCodeAttempts || 0;
                    if (currentAttempts >= 5) {
                      setEmailVerifyError("⚠ Muitas tentativas inválidas. Solicite um novo código de verificação.");
                      return;
                    }

                    // Expiry check - 17 minutes limit
                    const expiresAt = privateProfile.emailCodeExpiresAt || 0;
                    if (Date.now() > expiresAt) {
                      setEmailVerifyError("⚠ Código expirado. Solicite um novo código de verificação.");
                      return;
                    }

                    const enteredCode = userEmailVerifyInput.trim();
                    if (enteredCode !== privateProfile.emailCode) {
                      const newAttempts = currentAttempts + 1;
                      const updateData: any = {
                        emailCodeAttempts: newAttempts
                      };

                      if (newAttempts >= 5) {
                        updateData.emailCode = null; // Discard invalid/reused code
                      }

                      await setDoc(privateDocRef, updateData, { merge: true });

                      if (newAttempts >= 5) {
                        setEmailVerifyError("⚠ Muitas tentativas inválidas. Solicite um novo código de verificação.");
                      } else {
                        setEmailVerifyError(`Código incorreto. Tentativa ${newAttempts} de 5 incorretas. Insira novamente.`);
                      }
                      return;
                    }

                    // Success! Update public state
                    const publicDocRef = doc(db, 'profiles', passwordVerificationPendingProfile.id);
                    await setDoc(publicDocRef, {
                      isEmailVerified: true,
                      statusOnline: '● Online Agora'
                    }, { merge: true });

                    // Clear verification fields in private profile
                    await setDoc(privateDocRef, {
                      emailCode: null,
                      emailCodeAttempts: 0,
                      emailCodeResendsCount: 0
                    }, { merge: true });

                    // Load updated public profile
                    const publicSnap = await getDoc(publicDocRef);
                    const activatedProfile = publicSnap.data() as Profile;

                    setEmailSuccessNotification(null);
                    setShowEmailVerifyModal(false);
                    setUserEmailVerifyInput('');
                    setPasswordVerificationPendingProfile(null);
                    setSuccessMessage('E-mail verificado com sucesso! Bem-vindo ao Scrapzone!');

                    onLoginSuccess(activatedProfile, false);

                  } catch (err) {
                    console.error(err);
                    setEmailVerifyError('Falha ao validar código. Tente novamente.');
                  }
                }} className="space-y-4">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-black text-neutral-600 uppercase tracking-wide text-center sm:text-left">
                      Digite o código enviado para seu e-mail:
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={userEmailVerifyInput}
                      onChange={(e) => setUserEmailVerifyInput(e.target.value.replace(/\D/g, ''))}
                      placeholder="Ex: 582741"
                      className="w-full text-center text-xl tracking-widest font-mono py-2 bg-white border-2 border-neutral-350 rounded focus:border-[#1b4372] focus:outline-none text-[#1b4372] font-semibold"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-2 pt-1">
                    <button
                      type="submit"
                      className="w-full py-2 bg-[#ed3fa7] hover:bg-[#d6278f] active:bg-[#ba1e7a] text-white font-black text-xs uppercase tracking-wide rounded cursor-pointer transition-all flex items-center justify-center gap-1.5 border-none"
                    >
                      <span>✓ Confirmar Código & Ativar Conta</span>
                    </button>

                    <div className="flex justify-between items-center text-xs mt-1">
                      <button
                        type="button"
                        onClick={async () => {
                          if (!passwordVerificationPendingProfile) return;
                          
                          try {
                            const privateDocRef = doc(db, 'private_profiles', passwordVerificationPendingProfile.id);
                            const privateDocSnap = await getDoc(privateDocRef);
                            if (!privateDocSnap.exists()) return;

                            const privateProfile = privateDocSnap.data();

                            // Resend exhaustion limit check: max 5 resends!
                            const currentResends = privateProfile.emailCodeResendsCount || 0;
                            if (currentResends >= 5) {
                              setEmailVerifyError("⚠ Limite de reenvio de código excedido (máximo de 5 envios).");
                              return;
                            }

                            // Anti-spam 1-minute interval limit
                            const lastSent = privateProfile.emailCodeLastSentAt || 0;
                            const elapsed = Date.now() - lastSent;
                            if (elapsed < 60000) {
                              const waitSecs = Math.ceil((60000 - elapsed) / 1000);
                              setEmailVerifyError(`⚠ Limite de requisições: Aguarde ${waitSecs} s para reenviar o e-mail.`);
                              return;
                            }

                            const newCode = Math.floor(100000 + Math.random() * 900000).toString();
                            const newExpires = Date.now() + 17 * 60 * 1000;

                            const updated = {
                              ...privateProfile,
                              emailCode: newCode,
                              emailCodeExpiresAt: newExpires,
                              emailCodeAttempts: 0,
                              emailCodeResendsCount: currentResends + 1,
                              emailCodeLastSentAt: Date.now()
                            };

                            await setDoc(privateDocRef, updated);

                            const pendingObj = {
                              ...passwordVerificationPendingProfile,
                              emailCode: newCode,
                              emailCodeExpiresAt: newExpires,
                              emailCodeAttempts: 0,
                              emailCodeResendsCount: currentResends + 1,
                              emailCodeLastSentAt: Date.now()
                            };
                            setPasswordVerificationPendingProfile(pendingObj);

                            sendEmailSimulatedNotification(passwordVerificationPendingProfile.email, newCode);
                            setEmailVerifyError('');
                            setUserEmailVerifyInput('');

                          } catch (e) {
                            console.error(e);
                            setEmailVerifyError('Erro no reenvio do código.');
                          }
                        }}
                        className="text-[#103056] font-bold hover:underline bg-transparent border-none cursor-pointer flex items-center gap-1"
                      >
                        [ Reenviar Código ] 🔄
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowEmailVerifyModal(false);
                          setEmailSuccessNotification(null);
                          if (isEmailUnverifiedProfile && onLogout) {
                            onLogout();
                          }
                        }}
                        className="text-neutral-500 hover:text-neutral-700 underline bg-transparent border-none cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>

                    {passwordVerificationPendingProfile && (
                      <div className="text-[10px] text-neutral-500 font-sans text-center mt-1">
                        Utilizações: Envios ({passwordVerificationPendingProfile.emailCodeResendsCount || 1}/5) • Código expira em 17 minutos
                      </div>
                    )}
                  </div>
                </form>
              </div>

              {/* Bottom Decorative Status Area */}
              <div className="bg-[#dee7f4] border-t border-[#b7cbdc] px-4 py-2 flex items-center justify-between text-[10px] text-neutral-600 font-sans">
                <span>Status: Validando Integridade do E-mail</span>
                <span className="font-semibold text-emerald-700">Verificação Segura SHA-256</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Optional Two-Factor Authentication (MFA / 2FA) Modal */}
      <AnimatePresence>
        {showMfaModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          >
            <motion.div
              initial={{ y: -30, scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: -30, scale: 0.95 }}
              className="max-w-md w-full bg-[#f3f7fc] border-2 border-[#1b4372] rounded shadow-2xl overflow-hidden font-sans text-left"
            >
              {/* Window Header */}
              <div className="bg-[#1b4372] px-4 py-2.5 flex items-center justify-between text-white select-none">
                <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 font-sans">
                  <Lock size={13} className="text-pink-400" />
                  Autenticação de Dois Fatores (MFA / 2FA)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setShowMfaModal(false);
                    setEmailSuccessNotification(null);
                    setMfaPendingProfile(null);
                    setUserMfaInput('');
                    setMfaError('');
                  }}
                  className="text-neutral-300 hover:text-white font-bold text-xs bg-transparent border-none cursor-pointer font-mono"
                >
                  [ Fechar ]
                </button>
              </div>

              {/* Content Panel */}
              <div className="p-5 space-y-4">
                <div className="bg-indigo-50 border border-indigo-200 rounded p-3 text-xs text-[#1e3a8a] leading-relaxed">
                  <span className="font-bold block mb-1 font-sans">Status de Login: <span className="text-[#103056] uppercase font-sans font-black">REQUER MFA 🔒</span></span>
                  Para sua total proteção, a autenticação de 2 fatores está ativada. Enviamos um código de acesso de 6 dígitos para o e-mail cadastrado associado a esta conta: <strong className="text-black font-semibold">{mfaPendingProfile?.email}</strong>.
                </div>

                {mfaError && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-805 text-xs p-2.5 rounded flex items-start gap-1.5 font-sans animate-fade-in text-[11px]">
                    <AlertCircle size={15} className="flex-shrink-0 mt-0.5 text-rose-600" />
                    <span className="font-semibold text-rose-850">{mfaError}</span>
                  </div>
                )}

                <form onSubmit={async (e) => {
                  e.preventDefault();
                  setMfaError('');
                  
                  if (!mfaPendingProfile) return;

                  try {
                    const privateDocRef = doc(db, 'private_profiles', mfaPendingProfile.id);
                    const privateDocSnap = await getDoc(privateDocRef);
                    if (!privateDocSnap.exists()) {
                      setMfaError('Configuração de segurança da conta não encontrada.');
                      return;
                    }

                    const privateProfile = privateDocSnap.data();

                    // Brute force checks
                    const currentAttempts = privateProfile.mfaCodeAttempts || 0;
                    if (currentAttempts >= 5) {
                      setMfaError("⚠ Muitas tentativas de MFA inválidas. Faça login novamente para receber um novo código.");
                      return;
                    }

                    // Expiry check - 10 minutes limit
                    const expiresAt = privateProfile.mfaCodeExpiresAt || 0;
                    if (Date.now() > expiresAt) {
                      setMfaError("⚠ Código de 2 fatores expirado. Por favor, volte e tente login novamente.");
                      return;
                    }

                    const enteredCode = userMfaInput.trim();
                    if (enteredCode !== privateProfile.mfaCode) {
                      const newAttempts = currentAttempts + 1;
                      const updateData: any = {
                        mfaCodeAttempts: newAttempts
                      };

                      if (newAttempts >= 5) {
                        updateData.mfaCode = null; // Discard invalid/reused code
                      }

                      await setDoc(privateDocRef, updateData, { merge: true });

                      if (newAttempts >= 5) {
                        setMfaError("⚠ Muitas tentativas inválidas. Faça login novamente para receber outro código.");
                      } else {
                        setMfaError(`Código de 2 fatores incorreto. Tentativa ${newAttempts} de 5. Tente novamente.`);
                      }
                      return;
                    }

                    // Success! Clean up code fields in private profiles
                    await setDoc(privateDocRef, {
                      mfaCode: null,
                      mfaCodeAttempts: 0
                    }, { merge: true });

                    // Login the user fully
                    const uid = mfaPendingProfile.id;
                    if (rememberMe) {
                      localStorage.setItem('orkut_remember_uid', uid);
                    } else {
                      localStorage.removeItem('orkut_remember_uid');
                    }

                    // Clear login attempts counter
                    localStorage.removeItem('scrapzone_login_attempts');
                    localStorage.removeItem('scrapzone_login_lockout_until');
                    setAttempts(0);
                    setLockoutUntil(0);

                    // De-escalate MFA modal
                    setEmailSuccessNotification(null);
                    setShowMfaModal(false);
                    setUserMfaInput('');
                    setMfaPendingProfile(null);
                    setSuccessMessage('Autenticação de 2 fatores realizada com sucesso!');

                    onLoginSuccess(mfaPendingProfile, false);

                  } catch (err) {
                    console.error(err);
                    setMfaError('Erro de sistema ao validar o código 2FA. Tente novamente.');
                  }
                }} className="space-y-4">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-black text-neutral-600 uppercase tracking-wide text-center sm:text-left">
                      Insira o seu código pin de 2 fatores recebido:
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={userMfaInput}
                      onChange={(e) => setUserMfaInput(e.target.value.replace(/\D/g, ''))}
                      placeholder="Ex: 123456"
                      className="w-full text-center text-xl tracking-widest font-mono py-2 bg-white border-2 border-neutral-350 rounded focus:border-[#1b4372] focus:outline-none text-[#1b4372] font-semibold"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-2 pt-1 font-sans">
                    <button
                      type="submit"
                      className="w-full py-2 bg-[#1b4372] hover:bg-[#102a4b] text-white font-black text-xs uppercase tracking-wide rounded cursor-pointer transition-all flex items-center justify-center gap-1.5 border-none"
                    >
                      <span>🔓 Confirmar Token & Acessar Conta</span>
                    </button>

                    <div className="flex justify-between items-center text-xs mt-1">
                      <button
                        type="button"
                        onClick={async () => {
                          if (!mfaPendingProfile) return;
                          
                          try {
                            const privateDocRef = doc(db, 'private_profiles', mfaPendingProfile.id);
                            const privateDocSnap = await getDoc(privateDocRef);
                            if (!privateDocSnap.exists()) return;

                            const privateProfile = privateDocSnap.data();

                            // Anti-spam 1-minute limit
                            const lastSent = privateProfile.mfaCodeLastSentAt || 0;
                            const elapsed = Date.now() - lastSent;
                            if (elapsed < 60000) {
                              const waitSecs = Math.ceil((60000 - elapsed) / 1000);
                              setMfaError(`Aguarde ${waitSecs} s para reenviar o código.`);
                              return;
                            }

                            const newCode = Math.floor(100000 + Math.random() * 900000).toString();
                            const newExpires = Date.now() + 10 * 60 * 1000;

                            const updated = {
                              mfaCode: newCode,
                              mfaCodeExpiresAt: newExpires,
                              mfaCodeAttempts: 0,
                              mfaCodeLastSentAt: Date.now()
                            };

                            await setDoc(privateDocRef, updated, { merge: true });

                            setMfaPendingProfile({
                              ...mfaPendingProfile,
                              mfaCode: newCode,
                              mfaCodeExpiresAt: newExpires
                            });

                            sendMfaEmailNotification(mfaPendingProfile.email, newCode);
                            setMfaError('');
                            setUserMfaInput('');

                          } catch (e) {
                            console.error(e);
                            setMfaError('Erro no reenvio do código 2FA.');
                          }
                        }}
                        className="text-[#103056] font-bold hover:underline bg-transparent border-none cursor-pointer flex items-center gap-1 font-sans"
                      >
                        [ Reenviar Código ] 🔄
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowMfaModal(false);
                          setEmailSuccessNotification(null);
                          setMfaPendingProfile(null);
                          setUserMfaInput('');
                          setMfaError('');
                        }}
                        className="text-neutral-500 hover:text-neutral-700 underline bg-transparent border-none cursor-pointer font-sans"
                      >
                        Cancelar login
                      </button>
                    </div>

                    {mfaPendingProfile && (
                      <div className="text-[10px] text-neutral-500 font-sans text-center mt-1">
                        Código válido por 10 minutos
                      </div>
                    )}
                  </div>
                </form>
              </div>

              {/* Bottom Decorative Status Area */}
              <div className="bg-[#dee7f4] border-t border-[#b7cbdc] px-4 py-2 flex items-center justify-between text-[10px] text-neutral-600 font-sans">
                <span>Passo de Segurança: Dois Fatores Opcionais</span>
                <span className="font-semibold text-emerald-700">Canal Seguro Ativo</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Simulated Email Notification Toast */}
      <AnimatePresence>
        {emailSuccessNotification && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-4 right-4 z-[9999] max-w-sm w-full bg-[#1e293b] border-2 border-emerald-500 rounded-lg shadow-2xl p-4 text-white font-sans flex items-start gap-3 select-none"
            id="email-simulation-toast"
          >
            <div className="bg-emerald-500/20 p-2 rounded-full text-emerald-400 mt-0.5 animate-pulse flex-shrink-0">
              <Mail size={18} className="text-emerald-400" />
            </div>
            <div className="flex-1 text-left">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] uppercase font-black tracking-wider text-emerald-400 font-sans">Caixa de Entrada (E-mail Simulado)</span>
                <button 
                  onClick={() => setEmailSuccessNotification(null)}
                  className="text-neutral-400 hover:text-white font-bold text-xs bg-transparent border-none cursor-pointer p-0 font-mono"
                >
                  ×
                </button>
              </div>
              <p className="text-[11px] text-neutral-200 font-mono font-medium whitespace-pre-line leading-relaxed">
                {emailSuccessNotification}
              </p>
              <div className="mt-2 text-[8px] text-neutral-400 font-mono flex justify-between items-center">
                <span>Servidor de E-mail Integrado</span>
                <span className="text-neutral-500 font-sans">Apenas Recebido</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
