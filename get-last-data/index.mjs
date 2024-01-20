import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import jwt from 'jsonwebtoken';

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

async function getPairedDevices(username) {
    const command = new ScanCommand({
        TableName: "paired",
        FilterExpression:
            "username = :username",
        ExpressionAttributeValues: {
            ":username": username,
        }
    });
    const { Items } = await docClient.send(command);
    return Items.map(el => el.device_id);
}

async function getData(devices) {
    let data = []
    for (const deviceId of devices) {
        const command = new GetCommand({
            TableName: 'device_data',
            Key: {
                'device_id': deviceId
            }
        });
        const { Item } = await docClient.send(command);
        data = [...data, Item];
    }
    return data;
}

export const handler = async (event) => {
    let body;
    let statusCode = '200';
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };

    try {
        if (event.httpMethod !== 'GET') {
            statusCode = '400';
            throw new Error(`Unsupported method "${event.httpMethod}"`);
        }
        if (!event.headers["Authorization"]) {
            statusCode = '401';
            throw new Error("Missing access token");
        }
        const token = event.headers["Authorization"].split(" ")[1];
        const username = await verifyToken(token).catch((err) => {
            statusCode = '401';
            throw new Error(err.message);
        });
        const devices = await getPairedDevices(username).catch((err) => {
            throw new Error("Error reading paired devices: " + err.message)
        });
        body = await getData(devices).catch((err) => {
            throw new Error("Error reading data: " + err.message)
        });
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