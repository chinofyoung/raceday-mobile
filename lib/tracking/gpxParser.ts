/**
 * Simple GPX parser to extract latitude and longitude points from a GPX string.
 */
export interface LatLng {
    latitude: number;
    longitude: number;
}

export function parseGPX(gpxString: string): LatLng[] {
    const points: LatLng[] = [];
    // More robust regex to handle various trkpt formats
    const regex = /<trkpt\s+lat="([^"]+)"\s+lon="([^"]+)"/g;
    let match;

    while ((match = regex.exec(gpxString)) !== null) {
        points.push({
            latitude: parseFloat(match[1]),
            longitude: parseFloat(match[2]),
        });
    }

    return points;
}
