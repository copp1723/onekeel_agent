EXPECTED_COLUMNS = [
    {"name": "SoldDate", "aliases": ["sale_date", "date_sold", "sold_on", "dateofsale"]},
    {"name": "CustomerName", "aliases": ["customer", "client_name", "buyer_name", "purchaser"]},
    {"name": "SellingPrice", "aliases": ["price", "amount_sold", "sale_price", "final_price"]},
    # Add more as needed for your use cases
]

LEAD_SOURCES = [
    {"name": "NeoIdentity", "aliases": ["Neo Ident.", "NeoIdent.", "Neo Ident", "NeoIdentity", "Neo Identified"]},
    {"name": "AutoTrader", "aliases": ["Auto Trader", "Autotrader", "AutoTrader.com", "AT"]},
    {"name": "CarGurus", "aliases": ["Car Gurus", "Cargurus.com", "CarGurus"]},
    {"name": "Facebook", "aliases": ["FB", "Facebook Marketplace", "Facebook"]},
    {"name": "WalkIn", "aliases": ["Walk In", "Walk-In", "WalkIn"]},
    # Add more canonical sources and aliases as needed
] 