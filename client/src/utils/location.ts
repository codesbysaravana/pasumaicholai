/**
 * Utility to detect the user's state/region based on IP geolocation.
 * Mapping logic for Indian states to all supported languages.
 */

export async function detectLanguageByLocation(): Promise<string | null> {
    const stateMap: Record<string, string> = {
        "Tamil Nadu": "ta", "Karnataka": "kn", "Kerala": "ml",
        "Andhra Pradesh": "te", "Telangana": "te", "Maharashtra": "mr",
        "Gujarat": "gu", "Punjab": "pa", "West Bengal": "bn",
        "Odisha": "or", "Orissa": "or", "Haryana": "hi",
        "Delhi": "hi", "Uttar Pradesh": "hi", "Madhya Pradesh": "hi",
        "Rajasthan": "hi", "Bihar": "hi", "Jharkhand": "hi",
        "Chhattisgarh": "hi", "Uttarakhand": "hi", "Himachal Pradesh": "hi",
        "Chandigarh": "hi", "Assam": "as"
    };

    const getStateFromIP = async () => {
        try {
            // Using a slightly faster/more reliable mirror for India if possible, or just sticking to ipapi
            const resp = await fetch("https://ipapi.co/json/");
            if (resp.ok) {
                const data = await resp.json();
                console.log("IP-based State:", data.region);
                return data.region;
            }
        } catch (e) { console.error("IP detection failed", e); }
        return null;
    };

    return new Promise(async (resolve) => {
        // Parallelized detection: Start IP check immediately as it's usually faster
        const ipPromise = getStateFromIP();

        if (navigator.geolocation) {
            let resolved = false;
            const timeout = setTimeout(async () => {
                if (!resolved) {
                    console.log("Geolocation timed out, using IP result...");
                    const state = await ipPromise;
                    resolve(state ? stateMap[state] || "en" : "en");
                    resolved = true;
                }
            }, 3000); // Reduced to 3s for better "instant" feel

            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    if (resolved) return;
                    clearTimeout(timeout);
                    resolved = true;

                    try {
                        const { latitude, longitude } = position.coords;
                        const resp = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
                        if (resp.ok) {
                            const data = await resp.json();
                            const state = data.principalSubdivision;
                            console.log("Geo detected State:", state);
                            resolve(stateMap[state] || "en");
                        } else {
                            throw new Error();
                        }
                    } catch {
                        const state = await ipPromise;
                        resolve(state ? stateMap[state] || "en" : "en");
                    }
                },
                async () => {
                    if (resolved) return;
                    clearTimeout(timeout);
                    resolved = true;
                    console.log("Geolocation denied/failed, using IP result...");
                    const state = await ipPromise;
                    resolve(state ? stateMap[state] || "en" : "en");
                },
                { timeout: 3000, enableHighAccuracy: false } // High accuracy is slower
            );
        } else {
            const state = await ipPromise;
            resolve(state ? stateMap[state] || "en" : "en");
        }
    });
}
