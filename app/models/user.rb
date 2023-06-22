class User < ApplicationRecord
  before_create :set_default_admin

  # Devise modules
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable

  def admin?
    admin
  end

  private

  def set_default_admin
    self.admin = false
  end


  def full_name
    "#{first_name} #{last_name}"
  end

  public :full_name
end
