import { Platform } from 'react-native';

/**
 * App Store 3.1.1: no iOS, conteúdo digital só pode ser vendido por In-App
 * Purchase — o app não pode apontar pro checkout externo (TheMembers/Eduzz)
 * nem pra página de ajuda que leva até ele. Android e web seguem com o
 * checkout externo, que o Google permite para apps de consumo.
 *
 * É flag de build de propósito: trocar isso remotamente seria "recurso
 * escondido do revisor" (App Store 2.3.1).
 */
export const USE_NATIVE_IAP = Platform.OS === 'ios';
