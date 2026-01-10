#!/bin/bash
# MongoDB Import Script
# Run this script to import all collections into MongoDB

DB_NAME="loanease"

mongoimport --db $DB_NAME --collection users --file users.json --jsonArray --drop
mongoimport --db $DB_NAME --collection organisations --file organisations.json --jsonArray --drop
mongoimport --db $DB_NAME --collection organisation_directors --file organisation_directors.json --jsonArray --drop
mongoimport --db $DB_NAME --collection clients --file clients.json --jsonArray --drop
mongoimport --db $DB_NAME --collection opportunities --file opportunities.json --jsonArray --drop
mongoimport --db $DB_NAME --collection opportunity_details --file opportunity_details.json --jsonArray --drop
mongoimport --db $DB_NAME --collection comments --file comments.json --jsonArray --drop
mongoimport --db $DB_NAME --collection audit_logs --file audit_logs.json --jsonArray --drop
mongoimport --db $DB_NAME --collection global_settings --file global_settings.json --jsonArray --drop
mongoimport --db $DB_NAME --collection email_verification_tokens --file email_verification_tokens.json --jsonArray --drop
mongoimport --db $DB_NAME --collection login_history --file login_history.json --jsonArray --drop
mongoimport --db $DB_NAME --collection auth_users --file auth_users.json --jsonArray --drop

echo "✅ Import complete!"
