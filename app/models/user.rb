class User < ApplicationRecord
  before_validation :format_names
  before_create :set_default_admin
  has_many :reviews, dependent: :destroy
  has_one_attached :profile_picture

  # Devise modules
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable

  # Custom validations for first_name and last_name
  validates :first_name, format: { with: /\A[a-zA-Z]+\z/, message: "can only contain letters" }
  validates :last_name, format: { with: /\A[a-zA-Z]+\z/, message: "can only contain letters" }

  def admin?
    admin
  end
  
  def full_name
    "#{first_name} #{last_name}"
  end


  def profile_picture_url
    profile_picture.attached? ? profile_picture : default_profile_picture
  end

  private

  def format_names
    self.first_name = format_name(first_name) if first_name.present?
    self.last_name = format_name(last_name) if last_name.present?
  end

  def format_name(name)
    name.downcase.capitalize
  end

  def set_default_admin
    self.admin = false
  end

  def default_profile_picture
    'blank-profile.png'
  end
end
