
current_pwd=$(pwd)

echo "开始设置git配置"

read -p "请输入username：" username
git config  user.name $username

read -p "请输入email：" email
git config  user.email $email

git config credential.helper "store --file=$current_pwd/.git/credential.store"
echo "已设置记住git账号密码"

git config  core.autocrlf input   
echo "已设置auto crlf = input"

git config core.filemode false
echo "已设置忽略文件模式变化"

echo "git配置完成"
