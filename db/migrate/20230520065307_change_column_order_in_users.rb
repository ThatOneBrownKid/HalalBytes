class ChangeColumnOrderInUsers < ActiveRecord::Migration[7.0]
  def change
    def change
      change_column :users, :email, :string, after: :id
      change_column :users, :first, :string, after: :email
      change_column :users, :last, :string, after: :first
      change_column :users, :admin, :boolean, default: false, after: :last
    end
  end
end
