"use client";

import { useState, useCallback, useRef } from "react";

/**
 * End-to-End Encryption hook using Web Crypto API.
 * 
 * Flow:
 * 1. Generate ECDH key pair on mount
 * 2. Export public key as JWK
 * 3. Exchange public keys via signaling (WebSocket)
 * 4. On receiving remote public key, derive shared AES-GCM key
 * 5. encrypt(text) → base64 ciphertext
 * 6. decrypt(ciphertext) → plaintext
 */

interface EncryptionState {
    isReady: boolean;
    publicKeyJwk: JsonWebKey | null;
}

export function useEncryption() {
    const [state, setState] = useState<EncryptionState>({
        isReady: false,
        publicKeyJwk: null,
    });

    const keyPairRef = useRef<CryptoKeyPair | null>(null);
    const sharedKeyRef = useRef<CryptoKey | null>(null);
    const initedRef = useRef(false);

    // Generate ECDH key pair
    const initKeys = useCallback(async () => {
        if (initedRef.current) return state.publicKeyJwk;
        initedRef.current = true;

        try {
            const keyPair = await crypto.subtle.generateKey(
                { name: "ECDH", namedCurve: "P-256" },
                true, // extractable
                ["deriveKey"]
            );
            keyPairRef.current = keyPair;

            const publicKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
            setState({ isReady: false, publicKeyJwk });
            console.log("[E2E] Key pair generated");
            return publicKeyJwk;
        } catch (err) {
            console.error("[E2E] Key generation failed:", err);
            return null;
        }
    }, [state.publicKeyJwk]);

    // Receive remote public key and derive shared secret
    const deriveSharedKey = useCallback(async (remotePublicKeyJwk: JsonWebKey) => {
        if (!keyPairRef.current) {
            console.warn("[E2E] No local key pair yet");
            return;
        }

        try {
            const remotePublicKey = await crypto.subtle.importKey(
                "jwk",
                remotePublicKeyJwk,
                { name: "ECDH", namedCurve: "P-256" },
                false,
                []
            );

            const sharedKey = await crypto.subtle.deriveKey(
                { name: "ECDH", public: remotePublicKey },
                keyPairRef.current.privateKey,
                { name: "AES-GCM", length: 256 },
                false,
                ["encrypt", "decrypt"]
            );

            sharedKeyRef.current = sharedKey;
            setState(prev => ({ ...prev, isReady: true }));
            console.log("[E2E] Shared key derived — encryption active");
        } catch (err) {
            console.error("[E2E] Key derivation failed:", err);
        }
    }, []);

    // Encrypt text → { iv, data } (both base64)
    const encrypt = useCallback(async (text: string): Promise<{ iv: string; data: string } | null> => {
        if (!sharedKeyRef.current) return null;

        try {
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const encoded = new TextEncoder().encode(text);
            const encrypted = await crypto.subtle.encrypt(
                { name: "AES-GCM", iv },
                sharedKeyRef.current,
                encoded
            );

            return {
                iv: btoa(String.fromCharCode(...iv)),
                data: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
            };
        } catch (err) {
            console.error("[E2E] Encryption failed:", err);
            return null;
        }
    }, []);

    // Decrypt { iv, data } → plaintext
    const decrypt = useCallback(async (ciphertext: { iv: string; data: string }): Promise<string | null> => {
        if (!sharedKeyRef.current) return null;

        try {
            const iv = Uint8Array.from(atob(ciphertext.iv), c => c.charCodeAt(0));
            const data = Uint8Array.from(atob(ciphertext.data), c => c.charCodeAt(0));
            const decrypted = await crypto.subtle.decrypt(
                { name: "AES-GCM", iv },
                sharedKeyRef.current,
                data
            );

            return new TextDecoder().decode(decrypted);
        } catch (err) {
            console.error("[E2E] Decryption failed:", err);
            return null;
        }
    }, []);

    return {
        isE2EReady: state.isReady,
        publicKeyJwk: state.publicKeyJwk,
        initKeys,
        deriveSharedKey,
        encrypt,
        decrypt,
    };
}
