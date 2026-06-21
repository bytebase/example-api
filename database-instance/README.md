# Database Instance

This example demonstrates how to use Bytebase API to configure [Bytebase Instance](https://www.bytebase.com/docs/concepts/data-model/#database-instance).

## Fetch access token with service account

You have to call Bytebase API with [service account](https://www.bytebase.com/docs/api/authentication/).

```bash
export bytebase_url=http://localhost:8080
export bytebase_account=api-sample@service.bytebase.com
export bytebase_password=bbs_bQlG4Lc1kRt9fQNa1rNf
bytebase_token=$(curl -s ${bytebase_url}/v1/auth/login \
   --data-raw '{"email":"'${bytebase_account}'","password":"'${bytebase_password}'"}' \
   --compressed | grep -o '"token":"[^"]*"' | sed 's/"token":"//; s/"$//')
echo $bytebase_token
```

## Create a new Instance

```bash
curl --request POST "${bytebase_url}/v1/instances?instance_id=test1" \
     --header 'Authorization: Bearer '${bytebase_token} \
     --data @data/instance/create-instance.json
```

## Update an instance

The `update-instance.json` file contains all configurable parameters.

```bash
curl --request PATCH "${bytebase_url}/v1/instances/test1" \
     --header 'Authorization: Bearer '${bytebase_token} \
     --data @data/instance/update-instance.json
```

## Data source

Data sources are uniquely identified by data source ID(the value of `"id"` within `"dataSource"`).

### Add data source

**Note:** Only `READ_ONLY` data source can be added.

In case you hadn't had a MySQL server before, you may follow [this doc](/database-instance/data/data-source/configure-mysql-from-scratch.md) to configure a MySQL server from scratch with brew.

```bash
curl --request POST "${bytebase_url}/v1/instances/test1:addDataSource" \
     --header 'Authorization: Bearer '${bytebase_token} \
     --data @data/data-source/add-data-source.json
```

### Update data source

The `update-data-source.json` file includes all configurable parameters, including `"validateOnly"` which tests the data source connection, and `updateMask` as the list of fields to update. By default, `"validateOnly"` is set to `false` when adding new data sources to prevent overwriting existing ones.

```bash
curl --request PATCH "${bytebase_url}/v1/instances/test1:updateDataSource" \
     --header 'Authorization: Bearer '${bytebase_token} \
     --data @data/data-source/update-data-source.json
```

### Remove data source

Only `READ_ONLY` data source can be removed.

```bash
curl --request POST "${bytebase_url}/v1/instances/test1:removeDataSource" \
     --header 'Authorization: Bearer '${bytebase_token} \
     --data '{
      "dataSource": {
        "id": "A1B2C3D4-E5F6-7890-1234-56789ABCDEF0",
        "type": "READ_ONLY"
      }
    }'
```

## Databases

This command displays the names of all databases within the specified instance in your terminal. If no database exists, it will create a default database named `employee`.

```bash
curl --request POST "${bytebase_url}/v1/instances/test1:databases" \
     --header 'Authorization: Bearer '${bytebase_token} \
     --data @data/databases.json
```

## Sync

### Sync instance

Full sync updates all databases in the instance, whereas setting `"enableFullSync"` to `false` only refreshes instance metadata (e.g., the database list) and newly discovered instances.

```bash
curl --request POST "${bytebase_url}/v1/instances/test1:sync" \
     --header 'Authorization: Bearer '${bytebase_token} \
     --data '{
      "name": "instances/test1",
      "enableFullSync": true
    }'
```

### Batch sync instance

The `"request"` data in `batch-sync.json` defines the instances to sync, with a maximum batch limit of 1,000 instances.

```bash
curl --request POST "${bytebase_url}/v1/instances:batchSync" \
     --header 'Authorization: Bearer '${bytebase_token} \
     --data @data/batch-sync.json
```

### Sync slow queries

To use this feature, first [enable slow query logs](https://www.bytebase.com/docs/slow-query/overview/#step-1-enable-slow-queries-in-database) in your database.

Next, navigate to the desired Project, go to **Database** -> **Slow Queries**, and click **Configure** in the upper right corner. Toggle on the **Report** switch for the target instance, such as the newly created `MySQL instance via API`.

Once configured, you can sync slow queries at any time via the API.

```bash
curl --request POST "${bytebase_url}/v1/instances/test1:syncSlowQueries" \
     --header 'Authorization: Bearer '${bytebase_token} \
     --data '{
      "parent": "instance/test-sample-instance"
    }'
```

## Query

### Query all instances

```bash
curl --request GET ${bytebase_url}/v1/instances \
     --header 'Authorization: Bearer '${bytebase_token}
```

### Query certain one instance

```bash
curl --request GET ${bytebase_url}/v1/instances/test1 \
     --header 'Authorization: Bearer '${bytebase_token}
```

## Delete / Undelete

### Delete

_All databases_ should be transferred to the `unassigned project` before deleting the instance.

```bash
curl --request DELETE ${bytebase_url}/v1/instances/test1 \
     --header 'Authorization: Bearer '${bytebase_token}
```

### Undelete

Operates on _deleted resources_ only. Needs calling the `DELETE` API first.

```bash
curl --request POST "${bytebase_url}/v1/instances/test1:undelete" \
     --header 'Authorization: Bearer '${bytebase_token} \
     --data '{
      "name": "instance/test1"
    }'
```
