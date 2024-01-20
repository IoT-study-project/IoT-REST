# URL
https://i1j2f32umi.execute-api.eu-north-1.amazonaws.com/default
# Endpoints
## /register [POST] - deployed
Creates new user, saves them to database with given username and encrypted password
### Request body
`{
  'username': username,
  'password': password
}`

username - letters (upper and lowercase) and numbers, length from 6 to 16

password - at least one number, one uppercase letter, one lowercase letter and one special character length from 8 to 32
## /login [POST] - deployed
Signs in registered user, returns authorization token (JWT) - expires in 1h
### Request body
`{
  'username': username,
  'password': password
}`

username - letters (upper and lowercase) and numbers, length from 6 to 16

password - at least one number, one uppercase letter, one lowercase letter and one special character length from 8 to 32
## Response body
`{
  'username': username,
  'token': validJwtToken
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
    { device1Id: dataFromDevice1 },
    { device2Id: datafromDevice2 },
    ...
  ]
}`
