# Environment

This example demonstrates how to use Bytebase API to configure [Environment](https://www.bytebase.com/docs/concepts/data-model/#environment).

## Fetch access token with service account

You have to call Bytebase API with [service account](https://www.bytebase.com/docs/api/authentication/).

```bash
export bytebase_url=http://localhost:8080
export bytebase_account=api-sample@service.bytebase.com
export bytebase_password=bbs_***********6FEFl
bytebase_token=$(curl -s ${bytebase_url}/v1/auth/login \
   --data-raw '{"email":"'${bytebase_account}'","password":"'${bytebase_password}'"}' \
   --compressed | grep -o '"token":"[^"]*"' | sed 's/"token":"//; s/"$//')
echo $bytebase_token
```

## Query

### Query all

```bash
curl --request GET ${bytebase_url}/v1/environments \
     --header 'Authorization: Bearer '${bytebase_token}
```

### Query certain one

```bash
curl --request GET ${bytebase_url}/v1/environments/test \
     --header 'Authorization: Bearer '${bytebase_token}
```

## Configure

**Note:** The `order` parameter specifies the execution sequence of DDL/DML commands, while `title` corresponds to the `Environment Name` in the Bytebase UI.

### Create

```bash
curl --request POST "${bytebase_url}/v1/environments?environment_id=test1" \
     --header 'Authorization: Bearer '${bytebase_token} \
     --data '{
      "name": "",
      "state": "STATE_UNSPECIFIED",
      "title": "test1",
      "order": 1,
      "tier": "ENVIRONMENT_TIER_UNSPECIFIED",
      "color": "#008000"
    }'
```

### Update

```bash
curl --request PATCH "${bytebase_url}/v1/environments/test1?allow_missing=true" \
     --header 'Authorization: Bearer '${bytebase_token} \
     --data '{
      "name": "",
      "state": "STATE_UNSPECIFIED",
      "title": "test1-sample",
      "order": 1,
      "tier": "ENVIRONMENT_TIER_UNSPECIFIED",
      "color": ""
    }'
```

### Delete

```bash
curl --request DELETE ${bytebase_url}/v1/environments/test1 \
     --header 'Authorization: Bearer '${bytebase_token}
```

### Undelete

Turns the `tier` parameter into `UNPROTECTED`.

Operates on _deleted resources_ only. Needs calling the `DELETE` API first.

```bash
curl --request POST "${bytebase_url}/v1/environments/test1:undelete" \
     --header 'Authorization: Bearer '${bytebase_token} \
     --data '{
      "name": ""
    }'
```