class CreateRestaurants < ActiveRecord::Migration[7.0]
  def change
    create_table :restaurants do |t|
      t.string :name
      t.string :address
      t.string :phone
      t.string :website
      t.string :cuisine
      t.string :price_range
      t.integer :overall_rating

      t.timestamps
    end
  end
end
