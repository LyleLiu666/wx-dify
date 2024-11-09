import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

const mattermostUrl = `${process.env.MATTERMOST_HOST}/api/v4/posts`;
const mattermostHeaders = {
    'content-type': 'application/json',
    'authorization': `Bearer ${process.env.MATTERMOST_API_KEY}`
};

async function sendMessageToMattermost(
    message = "# 机器人已经掉线",
    channelId = process.env.MATTERMOST_CHANNEL_ID
) {
    if (!process.env.MATTERMOST_HOST || !process.env.MATTERMOST_API_KEY) {
        console.log(message);
        return;
    }
    const payload = {
        channel_id: channelId,
        message: message
    };

    try {
        const response = await axios.post(mattermostUrl, payload, { headers: mattermostHeaders });
        // console.log('Mattermost response:', response.data);
    } catch (error) {
        console.error('Error sending message to Mattermost:', error);
    }
}

export {
    sendMessageToMattermost
}; 