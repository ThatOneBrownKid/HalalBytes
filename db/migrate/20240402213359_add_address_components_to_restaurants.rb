class AddAddressComponentsToRestaurants < ActiveRecord::Migration[7.0]
  def change
    add_column :restaurants, :street, :string
    add_column :restaurants, :city, :string
    add_column :restaurants, :state, :string
    add_column :restaurants, :zip_code, :string
  end
end
