import axios from 'axios';

const apiKey = process.env.DIFY_API_KEY;
const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
};

async function callDifyChat(ask, userId, conversation_id, imageId) {
    const data = {
        inputs: {},
        query: ask,
        response_mode: 'blocking',
        conversation_id: conversation_id || '',
        user: userId,
        files: imageId ? [
            {
                type: 'image',
                transfer_method: 'local_file',
                upload_file_id: imageId,
            },
        ] : null,
    };

    try {
        const response = await axios.post(apiUrl, data, { headers });
        if (response.status != 200) {
            console.error("call dify error", response.status, response.data)
            return "系统繁忙"
        }
        return response.data
    } catch (error) {
        console.error('Error:', error);
        return "系统繁忙"
    }
}

async function updateImage(userId, imgBuffer, contentType) {
    const blob = new Blob([imgBuffer], { type: contentType });

    const formData = new FormData();
    formData.append("user", userId)
    formData.append('file', blob, 'image.jpg');

    const res = await axios.post(`${process.env.DIFY_HOST}/v1/files/upload`, formData, {
        maxContentLength: 100 * 1024 * 1024,// 设置为100MB
        headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${apiKey}`
        }
    })
    if (res.status != 201 && res.status != 200) {
        console.error(res.status)
        console.error(res.statusText)
        console.error("updateImage error", res.data)
        return ""
    }
    return res.data.id
}

async function callDifyWorkflow(userId, inputs = {}, files = null) {
    // console.log("start callDifyWorkflow", userId, inputs.user_msg)
    const apiUrl = `${process.env.DIFY_HOST}/v1/workflows/run`;
    
    const data = {
        inputs,
        response_mode: 'blocking',
        user: userId,
    };

    if (files) {
        data.files = files;
    }

    try {
        const response = await axios.post(apiUrl, data, { headers });
        if (response.status !== 200) {
            console.error("调用工作流出错", response.status, response.data);
            return {
                success: false,
                error: "系统繁忙",
                data: null
            };
        }
        return {
            success: true,
            error: null,
            data: response.data
        };
    } catch (error) {
        console.error('工作流调用错误:', error.response?.data || error.message);
        return {
            success: false,
            error: error.response?.data?.message || error.message || "系统繁忙",
            data: null
        };
    }
}

export {
    callDifyChat,
    updateImage,
    callDifyWorkflow
}; 