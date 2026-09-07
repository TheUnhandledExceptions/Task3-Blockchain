import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

export async function performReverseSearch(imagePath: string): Promise<{ url: string; title: string }> {
    const apiKey = process.env.SERPAPI_API_KEY;
    if (!apiKey) {
        throw new Error("Missing SERPAPI_API_KEY in environment variables");
    }

    // Step 1: Upload the image to SerpApi to get an image_id
    const form = new FormData();
    form.append('image', fs.createReadStream(imagePath));

    const uploadResponse = await axios.post(`https://serpapi.com/image?api_key=${apiKey}`, form, {
        headers: form.getHeaders()
    });

    const imageId = uploadResponse.data.image_id;
    if (!imageId) {
        throw new Error("Failed to extract image_id from SerpApi upload response");
    }

    // Step 2: Use the image_id to perform the Google Lens search
    const searchResponse = await axios.get('https://serpapi.com/search.json', {
        params: {
            engine: "google_lens",
            image_id: imageId,
            api_key: apiKey
        }
    });

    const visualMatches = searchResponse.data.visual_matches;
    
    // Step 3: Filter Results
    if (!visualMatches || !Array.isArray(visualMatches) || visualMatches.length === 0) {
        throw new Error("No visual matches found");
    }

    const socialDomains = [
        "x.com", 
        "twitter.com", 
        "instagram.com", 
        "linkedin.com", 
        "reddit.com", 
        "facebook.com"
    ];

    for (const match of visualMatches) {
        if (match.link) {
            try {
                const urlObj = new URL(match.link);
                const hostname = urlObj.hostname.toLowerCase();
                
                if (socialDomains.some(domain => hostname === domain || hostname.endsWith(`.${domain}`))) {
                    return {
                        url: match.link,
                        title: match.title || "Unknown Title"
                    };
                }
            } catch (e) {
                // Ignore invalid URLs
                continue;
            }
        }
    }

    // Fallback to the #1 visual match if no social match is found
    const firstMatch = visualMatches[0];
    if (!firstMatch.link) {
        throw new Error("No valid links found in visual matches");
    }
    
    return {
        url: firstMatch.link,
        title: firstMatch.title || "Unknown Title"
    };
}
