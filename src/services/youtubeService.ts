
import axios from 'axios';

const YOUTUBE_SEARCH_URL = 'https://www.googleapis.com/youtube/v3/search';

export interface YouTubeVideo {
    id: string;
    title: string;
    thumbnail: string;
    channelTitle: string;
}

export const searchYouTube = async (query: string, apiKey?: string): Promise<YouTubeVideo | null> => {
    try {
        const key = apiKey;
        if (!key) {
            console.error('YouTube API key is missing.');
            return null;
        }

        const response = await axios.get(YOUTUBE_SEARCH_URL, {
            params: {
                part: 'snippet',
                maxResults: 1,
                q: query,
                type: 'video',
                videoEmbeddable: 'true',
                videoSyndicated: 'true',
                key: key,
            },
        });

        const items = response.data.items;
        if (items && items.length > 0) {
            const video = items[0];
            return {
                id: video.id.videoId,
                title: video.snippet.title,
                thumbnail: video.snippet.thumbnails.high.url,
                channelTitle: video.snippet.channelTitle,
            };
        }
        return null;
    } catch (error) {
        console.error('Error searching YouTube:', error);
        return null;
    }
};
