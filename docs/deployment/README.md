# Deployment

The app runs the same way in every environment: one compose file, and an env
file per environment with the same keys as `.env.example`. The `Makefile` runs
it, with the environment as a parameter:

```bash
make help                          # every command
make up ENV=production             # build, then start MariaDB and both slots
```

`ENV` picks the settings file. `development`, the default, uses `.env`. Any
other value uses `.env.<ENV>`, such as `.env.production`. Export it once per
shell to stop typing it: `export ENV=production`.

| File                       | What it does                                             |
| -------------------------- | -------------------------------------------------------- |
| `Makefile`                 | The commands                                             |
| `docker-compose.yml`       | MariaDB, the `tools` container, and the app in two slots |
| `docker-compose.build.yml` | Builds the images from this checkout, using `Dockerfile` |
| `.env.production`          | Production settings. Git-ignored, from `.env.example`.   |

## Settings

```bash
make check ENV=production
```

It lists every required setting the file leaves empty. `make up` runs it first.

The app's containers get only its `NUXT_*` settings. The database has two users,
both with the host `mariadb`, the database's name inside Docker's network:

- **The migrator,** in `MIGRATION_DATABASE_URL`, may change tables. Unset,
  migrations use `NUXT_DATABASE_URL`. MariaDB creates it on its first start,
  from `MARIADB_USER` and `MARIADB_PASSWORD`.
- **The app's user,** in `NUXT_DATABASE_URL`, may only read and write data.
  `make app-user` creates it, with the query in `etc/sql/create-appuser.sql`.

## First Start

```bash
make up ENV=production
make migrate ENV=production
make app-user ENV=production
```

The app can't reach the database until `make app-user` has run. Running it again
resets that user's password and privileges, so it also applies a new password
from `NUXT_DATABASE_URL`.

Then make yourself the first platform admin, with a password you're asked for:

```bash
make admin-password ENV=production EMAIL=you@example.com
```

Or `make admin ENV=production EMAIL=you@example.com`, which prints a link to
choose your password, valid for 72 hours. Either way, you can also sign in with
Google using that email.

Migrations and `admin` run in the tools container, inside Docker's network, so
the URLs work as written.

## Slots

The app runs in two slots, blue and green, sharing one database. A release goes
to the idle slot:

```bash
make up ENV=production SLOT=green
```

Check it on its own port, then point the proxy at it. Rollback is pointing the
proxy back. Settings, Application shows which slot answered.

## Ports and the Proxy

Each slot listens where `BLUE_BIND` and `GREEN_BIND` say, `127.0.0.1:3000` and
`127.0.0.1:3001` by default. `127.0.0.1` is reachable from this machine only.

A proxy on another machine, or one connecting to this machine's network address,
gets "connection refused" from those defaults. Bind the slots to that address
instead, in the env file:

```bash
BLUE_BIND=192.168.1.150:3000
GREEN_BIND=192.168.1.150:3001
```

Port bindings are fixed when a container is created, so run `make up` again to
apply them. That exposes the slots to the whole network, so allow only the proxy
through the firewall, such as
`sudo ufw allow from <proxy ip> to any port 3000:3001 proto tcp`. Avoid
`0.0.0.0`, which opens every interface.

## Day to Day

```bash
make ps ENV=production               # what's running, and on which ports
make logs ENV=production SLOT=blue   # one JSON line per API request
make down ENV=production SLOT=blue   # stop the old slot after a release
make db-shell ENV=production         # MariaDB as root
make root-password ENV=production    # MariaDB's generated root password
```
