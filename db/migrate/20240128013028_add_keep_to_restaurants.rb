class AddKeepToRestaurants < ActiveRecord::Migration[7.0]
  def change
    add_column :restaurants, :keep, :boolean, default: true, null: false
  end
end
