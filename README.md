# Migration, Seeder, and Factory Creator

This package provides an easy way to generate migrations, seeders, and factories using built-in commands in Node.js. Developed by **NexxtApp**, this tool streamlines database management for your applications.

## Note: MongoDB functionality will be available soon. Meanwhile, all features for MySQL and PostgreSQL are fully functional and ready to use.

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

You are allowed to use this package in your own projects under the following conditions:
- You **may use** the package for personal or internal projects.
- You **must include** this copyright notice in any use of the package.

You **may not**:
1. Modify, alter, or adapt the package in any way.
2. Distribute, publish, or share the package with any third party.
3. Sell, sublicense, or claim ownership of the package.

THIS PACKAGE IS PROVIDED "AS IS," WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED. NEXXTAPP SHALL NOT BE LIABLE FOR ANY DAMAGES ARISING FROM ITS USE.

---
For more information, please contact **NexxtApp** at [https://nexxtapp.com](https://nexxtapp.com).

For more information about, how it works - **NexxtApp Medium** at [Migration, Seeder, and Factory Creator Story](https://medium.com/@nexxtapp.social/migration-seeder-and-factory-creator-ae95917200c8).

