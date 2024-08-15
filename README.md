
## Setting up MongoDB Cluster

### Initiate MongoDB ReplicaSet
`docker compose up -d`

### Connect to the MongoDB nodes
```bash
# mongo1 should be the primary
docker exec -it mongo1 mongosh -u root -p example --authenticationDatabase admin 
docker exec -it mongo2 mongosh -u root -p example --authenticationDatabase admin
docker exec -it mongo3 mongosh -u root -p example --authenticationDatabase admin
```

### Some helper commands
```bash

# list dbs
show dbs

# list connections
show collections

# read a collection
use testdb
db.testCollection.find()
```

### Check for cluster status

```bash
rs.conf()
rs.status()

# Adding custom delay to each secondary node, assuming node0 is the primary
# 10 seconds delay for secondary 1
# 15 seconds delay for secondary 2

cfg = rs.conf()
cfg.members[1].priority = 0
cfg.members[1].hidden = true
cfg.members[1].secondaryDelaySecs = 10 
rs.reconfig(cfg)

cfg = rs.conf()
cfg.members[2].priority = 0
cfg.members[2].hidden = true
cfg.members[2].secondaryDelaySecs = 15
rs.reconfig(cfg)
```

---

## Testing the server

### Using curl to call endpoints

### Example 1
```bash
# If the writeConcern is set as: << { w: 'majority' } >>
# It takes 10 seconds to have this api call done
curl -X POST http://localhost:3000/api/write-concern?id=2 | jq

# Expected logs:
# (write-concern) Start Time: 13:10:40
# (write-concern) Document inserted: { acknowledged: true, insertedId: '2' }
# (write-concern) End Time: 13:10:50
```

### Example 2
```bash
# If the writeConcern is set as: << { w: 3 } >>
# It takes 15 seconds to have this api call done
curl -X POST http://localhost:3000/api/write-concern?id=3 | jq

# Expected logs:
# (write-concern) Start Time: 13:15:30
# (write-concern) Document inserted: { acknowledged: true, insertedId: '3' }
# (write-concern) End Time: 13:15:45
```

### Example 3
```bash
curl -X POST http://localhost:3000/api/causal-consistency | jq

# More info will be added here
```