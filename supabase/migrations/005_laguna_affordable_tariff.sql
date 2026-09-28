-- Tarifas accesibles La Laguna (Torreón / Gómez / Lerdo)
update public.tariffs
set
  per_km_total = 5.5,
  per_km_driver = 4,
  per_km_app = 1.5,
  per_minute = 1.2,
  base_fare = 25,
  app_flat_fee = 5,
  wait_per_minute = 1,
  system_block_fee = 80,
  min_distance_km = 1.5,
  min_fare = 35,
  airport_toll_total = 20,
  airport_toll_driver = 15,
  airport_toll_app = 5,
  high_demand_active = false,
  surge_multiplier = 1.2
where active = true;
