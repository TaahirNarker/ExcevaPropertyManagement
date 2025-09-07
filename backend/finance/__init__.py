# Ensure Django loads the app config (and thus our signals) in all environments.
# For Django 3.2+ using automatic app config discovery, this is harmless.
default_app_config = 'finance.apps.FinanceConfig'


