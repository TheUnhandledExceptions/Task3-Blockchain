import crypto from 'crypto';

export function generateTransportHash(sourceUrl: string, discoveredAt: number): `0x${string}` {
    const data = `${sourceUrl}|${discoveredAt}`;
    const hash = crypto.createHash('sha256').update(data).digest('hex');
    return `0x${hash}`;
}

export function formatBytes32(hexString: string): `0x${string}` {
    let cleanHex = hexString;
    
    if (cleanHex.startsWith('0x') || cleanHex.startsWith('0X')) {
        cleanHex = cleanHex.substring(2);
    }
    
    // Pad to exactly 64 characters (32 bytes). 
    // Using trailing zeros to left-align the value in bytes32
    const paddedHex = cleanHex.padEnd(64, '0');
    
    // Ensure we don't exceed 64 characters in case the input was unexpectedly long
    const finalHex = paddedHex.substring(0, 64);
    
    return `0x${finalHex}`;
}
