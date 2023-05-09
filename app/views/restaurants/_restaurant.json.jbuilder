json.extract! restaurant, :id, :name, :address, :phone, :website, :cuisine, :price_range, :overall_rating, :created_at, :updated_at
json.url restaurant_url(restaurant, format: :json)
