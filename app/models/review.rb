class Review < ApplicationRecord
  belongs_to :restaurant
  belongs_to :user, optional: true
  has_many :replies, class_name: 'Review', foreign_key: 'parent_id', dependent: :destroy
  belongs_to :parent, class_name: 'Review', optional: true
  has_many_attached :images

  after_save :update_restaurant_rating
  after_destroy :update_restaurant_rating

  validates :content, presence: true
  validates :rating, presence: true, inclusion: { in: 1..5 }
  validate :validate_image_safety

  private

  def update_restaurant_rating
    # Calculate the new average rating with high precision
    new_rating = restaurant.reviews.average(:rating)&.to_f || 0.0
    restaurant.update(overall_rating: new_rating.round(1)) # Optional: Round to 2 decimal places
  end

  def validate_image_safety
    return unless images.attached?

    images.each do |image|
      analysis_service = AwsImageAnalysisService.new
      result = analysis_service.analyze_image(image.blob)
      
      unless result[:safe_for_work]
        images.purge
        errors.add(:images, 'contains inappropriate content')
        break
      end
    end
  end
end
