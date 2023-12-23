import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

async function getSecret() {
    const secret_name = "jwt";
    const client = new SecretsManagerClient({
        region: "us-east-1",
    });
    const response = await client.send(
        new GetSecretValueCommand({
            SecretId: secret_name,
            VersionStage: "AWSCURRENT"
        })
    );
    return response.SecretString;
}

async function verifyToken(token) {
    const user = jwt.verify(token, await getSecret());
    if (user) {
        return user.username;
    } else {
        throw new Error("Access denied");
    }
}

async function pairDevice(username, deviceId) {
    const command = new PutCommand({
        TableName: "paired",
        Item: {
            "id": uuidv4(),
            "username": username,
            "deviceId": deviceId
        },
    });
    return await docClient.send(command);
}

async function checkDeviceRequest(username) {
    expirationTime = new Date(Date.now().getTime() + 60 * 60000); // 1h from now
    const command = new QueryCommand({
        TableName: "requests",
        KeyConditionExpression:
            "username = :username",
        ExpressionAttributeValues: {
            ":username": username,
        },
        ConsistentRead: true,
    });
    const { Item } = await docClient.send(command);
    if (!Item) {
        return;
    }
    if (new Date(Item.time).getTime() > expirationTime.getTime()) {
        return;
    }
    return Item.deviceId;
}

async function createPairingRequest(username) {
    const command = new PutCommand({
        TableName: "requests",
        Item: {
            "username": username,
            "deviceId": null,
            "time": Date.now()
        },
    });
    return await docClient.send(command);
}

export const handler = async (event) => {
    let body;
    let statusCode = '200';
    const headers = {
        'Content-Type': 'application/json',
    };

    try {
        if (event.httpMethod !== 'POST') {
            statusCode = '400';
            throw new Error(`Unsupported method "${event.httpMethod}"`);
        }
        const token = event.headers["Authorization"].split(" ")[1];
        const username = await verifyToken(token).catch((err) => {
            statusCode = '401';
            throw new Error(err.message);
        });
        const deviceId = await checkDeviceRequest(username).catch((err) => {
            throw new Error("Error while verifying request: " + err.message)
        });
        if (deviceId) {
            await pairDevice(username, deviceId).catch((err) => {
                throw new Error("Pairing failed: " + err.message)
            });
        } else {
            await createPairingRequest(username).catch((err) => {
                throw new Error("Failed to create pairing request: " + err.message)
            });
        }

    } catch (err) {
        if (statusCode === '200') {
            statusCode = '500';
        }
        body = err.message;
    } finally {
        body = JSON.stringify(body);
    }

    return {
        statusCode,
        body,
        headers,
    };
};