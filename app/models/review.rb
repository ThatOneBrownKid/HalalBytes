class Review < ApplicationRecord
  belongs_to :restaurant
  belongs_to :user, optional: true
  has_many :replies, class_name: 'Review', foreign_key: 'parent_id', dependent: :destroy
  belongs_to :parent, class_name: 'Review', optional: true

  after_save :update_restaurant_rating
  after_destroy :update_restaurant_rating

  validates :content, presence: true
  validates :rating, presence: true, inclusion: { in: 1..5 }

  private

  def update_restaurant_rating
    # Calculate the new average rating with high precision
    new_rating = restaurant.reviews.average(:rating)&.to_f || 0.0
    restaurant.update(overall_rating: new_rating.round(1)) # Optional: Round to 2 decimal places
  end

end
