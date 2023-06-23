class User < ApplicationRecord
  before_validation :format_names
  before_create :set_default_admin

  # Devise modules
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable

  def admin?
    admin
  end

  def full_name
    "#{first_name} #{last_name}"
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
end
