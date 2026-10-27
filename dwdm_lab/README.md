# DWDM Lab - SE425 (Online Retail data set)
Put the full `Online_Retail.csv` in the folder you run the scripts from, then `pip install -r requirements.txt`.
| File | Type | Notes |
|---|---|---|
| load_data_to_mysql.py | Python (helper) | creates database `DTU`, table `online_retail`, loads the CSV (run once, needed for 4 and 5) |
| experiment_1.py - experiment_3.py | Python | read the CSV |
| experiment_4.sql | MySQL | star + snowflake schema, built from `DTU.online_retail` |
| experiment_5.sql | MySQL | OLAP on `retail_star` (run after experiment_4.sql) |
| experiment_6.py | Python | ETL: CSV + JSON + MySQL -> `retail_etl` |
| experiment_7.py - experiment_9.py | Python (mlxtend) | exactly as in the lab draft |
| experiment_10.py - experiment_12.py | Python | read the CSV |
| mini_project.py | Python (mlxtend) | exactly as in the lab draft; needs experiment_6.py to have been run |
MySQL scripts: `mysql -u root -p < experiment_4.sql` (MySQL 8.0.1+ needed).
Python scripts that use MySQL assume user `root`, password `root`, host 127.0.0.1 - change the connection line at the top if yours differs.
