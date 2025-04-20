json.extract! review, :id, :restaurant_id, :user_id, :content, :likes, :rating, :parent_id, :created_at, :updated_at
json.url review_url(review, format: :json)
