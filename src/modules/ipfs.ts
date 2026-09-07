import axios from 'axios';
import FormData from 'form-data';
import * as fs from 'fs';

export async function pinToIPFS(filePath: string): Promise<string> {
    const jwt = process.env.PINATA_JWT;
    if (!jwt) {
        return "ipfs://unconfigured";
    }

    const data = new FormData();
    data.append("file", fs.createReadStream(filePath));

    const response = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", data, {
        headers: {
            "Authorization": `Bearer ${jwt}`,
            ...data.getHeaders()
        }
    });

    return "ipfs://" + response.data.IpfsHash;
}
