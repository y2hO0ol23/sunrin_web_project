# mysql
create database wowctf;
use wowctf;
create table user(
    userID char(20) not null Primary Key,
    userPassword char(64) not null,
    userName char(20) not null,
    userEmail char(255) not null,
    userScore int default 0
);

ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '1234';
select * from user;