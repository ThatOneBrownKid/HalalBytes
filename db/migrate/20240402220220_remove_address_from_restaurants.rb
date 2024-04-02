class RemoveAddressFromRestaurants < ActiveRecord::Migration[7.0]
  def change
    remove_column :restaurants, :address, :string
  end
end
