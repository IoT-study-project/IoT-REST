# URL
https://ugbnc4iymb.execute-api.us-east-1.amazonaws.com/default
# Endpoints
## /register [POST] - deployed
Creates new user, saves them to database with given username and encrypted password
### Request body
`{
  'username': username,
  'password': password
}`
## /login [POST] - deployed
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
## /logout [POST] - deployed
Signs out logged in user
### Required headers
`{
  'Authorization': 'Bearer ' + validJwtToken
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
