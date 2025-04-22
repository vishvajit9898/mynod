const express = require('express');
const bodyParser = require('body-parser');
const { Api, TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const cors = require('cors');
const { chats } = require('telegram/client');


const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
    origin: ["http://localhost:3000","http://localhost:5173"],
    credentials: true,
    methods: ["GET", "POST"]
}))
app.use(bodyParser.json());



const apiId = 23766603;
const apiHash = "db4d41372e1584d2ac372c1edad31e9a";
// const stringSession = new StringSession(""); // fill this later with the value from session.save()
// const client = new TelegramClient(stringSession, apiId, apiHash, {
//     connectionRetries: 5,
// });

app.post("/sendCode", async (req, res) => {
    const stringSession = new StringSession(""); // fill this later with the value from session.save()
    const client = new TelegramClient(stringSession, apiId, apiHash, {
        connectionRetries: 5,
    });
    await client.connect();
    const { phonenumber } = req.body;
    try {
        const result = await client.invoke(new Api.auth.SendCode({
            phoneNumber: phonenumber,
            apiId: apiId,
            apiHash: apiHash,
            settings: new Api.CodeSettings(),
        }));
        const sessionStringn = await client.session.save();
        res.status(200).json({ status: 'ok', result, sessionStringn });
    } catch (error) {
        console.error('Send code error:', error);
        res.status(500).json({ status: 'error', error: error.message });
    }
})

app.post("/verifyCode", async (req, res) => {
    const { code, phonenumber, phoneCodeHash, str } = req.body;

    const stringSession = new StringSession(str); // fill this later with the value from session.save()
    const client = new TelegramClient(stringSession, apiId, apiHash, {
        connectionRetries: 5,
    });
    await client.connect();
    try {
        const responce = await client.invoke(new Api.auth.SignIn({
            phoneNumber: phonenumber,
            phoneCodeHash: phoneCodeHash,
            phoneCode: code,
        }));
        const sessionStringn = await client.session.save();
        res.status(200).json({ status: 'ok', result: responce, sessionStringn });
    } catch (error) {
        console.error('Send code error:', error);
        res.status(500).json({ status: 'error', error: error.message });
    }
})

app.post("/createChannel", async (req, res) => {
    const { title, description, sessionString } = req.body;
    try {
        const stringSession = new StringSession(sessionString); // fill this later with the value from session.save()
        const client = new TelegramClient(stringSession, apiId, apiHash, {
            connectionRetries: 5,
        });
        await client.connect();
        const createChannelResponse = await client.invoke(new Api.channels.CreateChannel({
            broadcast: true,
            title: title,
            about: description,
        }));

        const botUsername = 'Onetapay_bot';
        const botResponse = await client.invoke(new Api.contacts.ResolveUsername({
            username: botUsername,
        }));

        const adminAccessResponse = await client.invoke(new Api.channels.EditAdmin({
            channel: createChannelResponse.chats[0],
            userId: botResponse.users[0].id,
            adminRights: new Api.ChatAdminRights({
                changeInfo: true,
                postMessages: true,
                editMessages: true,
                deleteMessages: true,
                inviteToChannel: true,
                inviteUsers: true,
                inviteToChat: true,
                pinMessages: true,
                addAdmins: true,
                manageCall: true,
            }),
            rank: "Admin",
        }));
        // await client.disconnect();
        res.status(200).json({
            status: 'ok',
            channelResponse: createChannelResponse,
            adminAccessResponse: adminAccessResponse,
        });
    } catch (error) {
        console.error('Create channel error:', error);
        res.status(500).json({ status: 'error', error: error.message });
    }
})
app.post("/addExistingChannel", async (req, res) => {
    const { channelId, accessHash, sessionString } = req.body;
    try {
        const stringSession = new StringSession(sessionString); // fill this later with the value from session.save()
        const client = new TelegramClient(stringSession, apiId, apiHash, {
            connectionRetries: 5,
        });
        await client.connect();

        const botUsername = 'Onetapay_bot';
        const botResponse = await client.invoke(new Api.contacts.ResolveUsername({
            username: botUsername,
        }));

        const adminAccessResponse = await client.invoke(new Api.channels.EditAdmin({
            channel: new Api.InputChannel({
                channelId: channelId,
                accessHash: accessHash
            }),
            userId: botResponse.users[0].id,
            adminRights: new Api.ChatAdminRights({
                changeInfo: true,
                postMessages: true,
                editMessages: true,
                deleteMessages: true,
                inviteToChannel: true,
                inviteUsers: true,
                inviteToChat: true,
                pinMessages: true,
                addAdmins: true,
                manageCall: true,
            }),
            rank: "Admin",
        }));
        // await client.disconnect();
        res.status(200).json({
            status: 'ok',
            adminAccessResponse: adminAccessResponse,
        });
    } catch (error) {
        console.error('Create channel error:', error);
        res.status(500).json({ status: 'error', error: error.message });
    }
})

app.post("/getUserChannels", async (req, res) => {
    const { sessionString, offsetDate } = req.body;
    const stringSession = new StringSession(sessionString); // fill this later with the value from session.save()
    const client = new TelegramClient(stringSession, apiId, apiHash, {
        connectionRetries: 5,
    });
    try {
        await client.connect();



        const inputPeerSelf = new Api.InputPeerSelf();
        const channelsResponse = await client.invoke(new Api.messages.GetDialogs({
            limit: 30,
            excludePinned: false,
            offsetDate: offsetDate,
            offsetPeer: inputPeerSelf,
        }));


        // const creatorChannels = channelsResponse['chats'].filter(channel => channel.creator === true);
        const creatorChannels = channelsResponse['chats'].filter(channel => channel.creator === true && channel.broadcast===true);
        const lastChannel = channelsResponse['chats'][0];
        let offse = 0; // Default offset date value


        if (channelsResponse['chats'].length > 0) {
            const lastChannel = channelsResponse['chats'][0];
            offse = lastChannel.date;
        }
        res.status(200).json({
            status: 'ok',
            channels: creatorChannels,
            ofid: offse,
        });
        await client.disconnect();
    } catch (error) {
        console.error('Get user channels error:', error);
        res.status(500).json({ status: 'error', error: error.message });
    }
});

app.post("/getPrivateChannelInfo", async (req, res) => {
    const { channelId, accessHash, sessionString } = req.body;
    try {
        const stringSession = new StringSession(sessionString);
        const client = new TelegramClient(stringSession, apiId, apiHash, {
            connectionRetries: 5,
        });
        await client.connect();

        const channelInfo = await client.invoke(new Api.channels.GetFullChannel({
            channel: new Api.InputChannel({
                channelId: channelId,
                accessHash: accessHash,
            }),
        }));

        res.status(200).json({
            status: 'ok',
            channelInfo: channelInfo,
        });
        await client.disconnect();
    } catch (error) {
        console.error('Get private channel info error:', error);
        res.status(500).json({ status: 'error', error: error.message });
    }
});

app.post("/generateChannelInviteLink", async (req, res) => {
    const { sessionString, channelId } = req.body;
    const stringSession = new StringSession(sessionString);
    const client = new TelegramClient(stringSession, apiId, apiHash, {
        connectionRetries: 5,
    });
    try {
        await client.connect();

        // Determine the chat entity type based on the chat ID
        let chatEntity;
        if (channelId.startsWith('@')) {
            // For channels with @
            chatEntity = new InputPeerChannel({ channel_id: channelId.substr(1) });
        } else {
            // For group chats, we can directly use the chat ID
            chatEntity = parseInt(channelId);
        }

        // Generate an invitation link for the chat
        const response = await client.invoke(new Api.messages.ExportChatInvite({
            peer: chatEntity,
            flags: Api.messages.ExportChatInvite.FLAG_BROADCAST,
        }));

        res.status(200).json({
            status: 'ok',
            inviteLink: response.link,
        });
    } catch (error) {
        console.error('Generate channel invite link error:', error);
        res.status(500).json({ status: 'error', error: error.message });
    }
});




app.post("/logout", async (req, res) => {
    try {
        // Disconnect the TelegramClient to log out
        await client.disconnect();

        res.status(200).json({ status: 'ok', message: 'Logged out successfully' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ status: 'error', error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
