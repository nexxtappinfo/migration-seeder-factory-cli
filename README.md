# Migration, Seeder, and Factory Creator

This package provides an easy way to generate migrations, seeders, and factories using built-in commands in Node.js. Developed by **NexxtApp**, this tool streamlines database management for your applications.

## Note: MongoDB functionality will be available soon. Meanwhile, all features for MySQL and PostgreSQL are fully functional and ready to use.

For more information about, how to use, check this article - **NexxtApp Medium** at [Migration, Seeder and Factory Creator In Nodejs](https://medium.com/@nexxtapp.social/migration-seeder-and-factory-creator-ae95917200c8).

## Features
- Generate migrations, seeders, and factories effortlessly
- Simple CLI commands for quick setup
- Compatible with Node.js version v18.20.7 and later.
- Supports PostgreSQL, MySQL

## Installation
```sh
npm install migration-seeder-factory
```

## How to Use After Installation


## Usage
Run the following commands to create respective database assets:

## Note
`--db=` - Not required. If you want, you can set the default database via your `.env` variable: **`DEFAULT_DB_TYPE`**.


### Commands

#### Create a Migration:
For MySQL:
```sh
npx nexxt make:migration create_sites_table --db=mysql
```
For PostgreSQL:
```sh
npx nexxt make:migration create_sites_table --db=postgrey
```


#### Run Migrations:
For MySQL:
```sh
npx nexxt migrate --db=mysql
```
For PostgreSQL:
```sh
npx nexxt migrate --db=postgrey
```


#### Rollback Migrations:
For MySQL:
```sh
npx nexxt migrate:rollback create_sites_table --db=mysql
```
For PostgreSQL:
```sh
npx nexxt migrate:rollback create_sites_table --db=postgrey
```


#### Create a Seeder:
For MySQL:
```sh
npx nexxt make:seeder sites_seeder --db=mysql
```
For PostgreSQL:
```sh
npx nexxt make:seeder sites_seeder --db=postgrey
```


#### Create Factory:
For MySQL:
```sh
npx nexxt make:factory sites_factory
```


#### Run Seeders:
For MySQL:
```sh
npx nexxt seed --db=mysql
```
For PostgreSQL:
```sh
npx nexxt seed --db=postgrey
```


## License
**Restricted Use License**

Copyright (c) 2025 **NexxtApp**

## Permissions
You are granted a **limited, non-exclusive, non-transferable** right to use this software under the following conditions:

- You may use this software **only for personal or internal projects**.
- You **must** retain this copyright notice in any use of the software.

## Restrictions
You **may not**:

1. Modify, alter, reverse engineer, or create derivative works based on this software.
2. Distribute, publish, sublicense, share, or make the software available to any third party.
3. Sell, rent, lease, or claim ownership of this software or any part of it.

## Enforcement
Any violation of these terms **immediately revokes** your right to use the software, and legal action may be taken against unauthorized use.

## Disclaimer
THIS SOFTWARE IS PROVIDED "AS IS," WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES, OR OTHER LIABILITY ARISING FROM THE USE OF THIS SOFTWARE.

By using this software, you acknowledge and agree to these terms.

---
For more information, please contact **NexxtApp** at [https://nexxtapp.com](https://nexxtapp.com).

For more information about, how it works - **NexxtApp Medium** at [Migration, Seeder and Factory Creator In Nodejs](https://medium.com/@nexxtapp.social/migration-seeder-and-factory-creator-ae95917200c8).

