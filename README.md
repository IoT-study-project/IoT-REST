# URL
https://ugbnc4iymb.execute-api.us-east-1.amazonaws.com/default
# Endpoints
## /register [POST]
Creates new user, saves them to database with given username and encrypted password
### Request body
`{
  'username': username,
  'password': password
}`
## /login [POST]
Signs in registered user, returns authorization token (JWT)
### Request body
`{
  'username': username,
  'password': password
}`
## Response body
`{
  'username': username,
  'token': validJwtToken
}`
## /logout [POST]
Signs out logged in user
### Request body
`{
  'username': username,
}`
## /pair-device [POST]
To be called from mobile app. Enables pairing. Awaits for /pair-me request from embedded system [below]
### Required headers
`{
  'Authorization': 'Bearer ' + validJwtToken
}`
## Response body
`{
  'username': username,
  'deviceId': deviceId
}`
## /pair-me [POST]
To be called from embedded system. Pairs calling device with user awaiting for pairing
### Request body
(may be better to sent token in Authorization header, but I do not see any vulnerabilities this way, sending token from mobile app to device requires encrypting message)

`{
  'username': username
}`
## /get-last-data [GET]
Returns most recent data from every paired up device
### Required headers
`{
  'Authorization': 'Bearer ' + validJwtToken
}`
## Response body
`{
  data: [
    dataFromDevice1,
    datafromDevice2,
    ...
  ]
}`
<hr>
This documentation covers only the successful case
