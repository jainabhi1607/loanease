
-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` bigint(50) NOT NULL,
  `admin_id` bigint(50) DEFAULT NULL,
  `username` varchar(255) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `company_name` varchar(255) DEFAULT NULL,
  `name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `phone` varchar(100) DEFAULT NULL,
  `abn` varchar(200) DEFAULT NULL,
  `acn` varchar(200) DEFAULT NULL,
  `number_of_directors` int(11) DEFAULT NULL,
  `entity` int(2) DEFAULT NULL,
  `retainer_type` int(2) DEFAULT NULL,
  `industry_type` int(2) DEFAULT NULL,
  `trading_name` varchar(255) DEFAULT NULL,
  `state` varchar(150) DEFAULT NULL,
  `role` int(1) DEFAULT NULL,
  `status` int(2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `admin_id`, `username`, `password`, `company_name`, `name`, `last_name`, `email`, `phone`, `abn`, `acn`, `number_of_directors`, `entity`, `retainer_type`, `industry_type`, `trading_name`, `state`, `role`, `status`) VALUES
(5, 1, 'luay@duofinance.com.au', '$2y$10$nqk2UZsLSLw/V1WVI7ArAO5ZZdMJ4xvppDACqEgFVYuO0GN6WmvrO', NULL, 'Clue', 'Finance', 'luay@duofinance.com.au', '3', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 1),
(8, NULL, 'jnshankey@gmail.com', '$2y$10$XE04ACWKSvfFk/XbaRLjGOclisK255r/FyYxn7FEJoE0BsD.EHRhi', 'Sterling Infotech', 'Shankey', 'Jain', 'jnshankey@gmail.com', '8788767', '67676', '675675', 3, NULL, NULL, NULL, NULL, NULL, 3, 1),
(9, 5, 'admin1', '$2y$10$8c6BlzqmmzSlP9BQ6lRaTu4N0GKtqi34BKeN3DNQcgw9JA7Wfez3W', NULL, 'First', 'Admin', 'admin1@test.com', '767765', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 1),
(13, NULL, 'pw@test.com', '$2y$10$Lcve79LG5YTY0yq.1rzEfuyMvSgbZzBDGKn.Cz0q0EfMZQQ80e5Dm', NULL, 'Paul', 'Williams', 'pw@test.com', '04830 7658', 'ABN-865546', 'ACN-23423', 2, NULL, NULL, NULL, NULL, NULL, 3, 3),
(14, 5, 'uj@test.com', '$2y$10$xKPhDl1PSLY6G4FiTnsLsOqY614a0jNAKe145Odfr4.8jTQjy3tde', NULL, 'user1', 'Jn', 'uj@test.com', '345345', 'ABN-865546', 'ACN-23423', NULL, NULL, NULL, NULL, NULL, NULL, 3, 3),
(16, NULL, 'abhishek@sxda.com.au', '$2y$10$ea/V/aT5TZGqdIy6WrkZFuEVCPUUXyMmMxsP8ffzkAASHGFCIpG8S', NULL, 'Abhishek', 'Jn', 'abhishek@sxda.com.au', '567576', 'ABN-865546', 'ACN-23423', 1, NULL, NULL, NULL, NULL, NULL, 1, 1),
(17, NULL, 'test2@northbase.io', '$2y$10$p3Vdm359RtbrZdL9O4ak3utCkTiJ.qEsACXdke5et0Rez.orhh/ly', NULL, 'Stuart', 'Cox', 'test2@northbase.io', '0438560629', '88888888888', '88888888888', 2, NULL, NULL, NULL, NULL, NULL, 3, 3),
(18, NULL, 'test3@northbase.io', '$2y$10$Y8jC.Set2eZwU2m8TLR7g.3at4Lqx4wCjTGzRlCFZbcJg0fSjEKCG', NULL, 'Stuart', 'Cox', 'test3@northbase.io', '0438560629', '88888888', '88888888', NULL, NULL, NULL, NULL, NULL, NULL, 3, 3),
(19, 5, 'chris@duofinance.com.au', '$2y$10$TMRLiRetE/b4BWJL5Wrz8u/4BL6sF.h/MkctAuh5/f3WlhecMOkaq', NULL, 'Chris', 'Anesco', 'chris@duofinance.com.au', '0421304990', '79 640 471 101', '640 471 101', 3, NULL, NULL, NULL, NULL, NULL, 3, 3),
(20, NULL, 'eamonn@duofinance.com.au', '$2y$10$YYtTHq10MeIRCyRCWcwfc.b2bRc/uDEApmwEjAuduoysp8tM1aGna', NULL, 'Eamonn', 'Keogh', 'eamonn@duofinance.com.au', '0409409310', '79 640 471 101', '640 471 101', 3, 1, NULL, NULL, NULL, NULL, 3, 3),
(21, 5, 'stuart@northbase.au', '$2y$10$cWUzD0/30tBlT.U1gCDuw.MgsgQs037zeWLQw0rSbwDeGUApeHGj.', NULL, 'Stuart', 'Cox', 'stuart@northbase.au', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 1),
(24, 20, 'user1@sxda.com.au', '$2y$10$l6SBdIRVTyFXO8D5rih79uF.JhnMcx5NOuosF4Zdr9eRpOuZRoJJG', NULL, 'Sylvia Cruz', 'cox', 'user1@sxda.com.au', '4683842798', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 3, 3),
(25, 20, 'user3@sxda.com.au', '$2y$10$AKOedzCO60xvVUFL3GT1buZfuqoyy2xQ8UJQCFVU.rsVtJXQaSYK2', NULL, 'Stuart', 'cox', 'user3@sxda.com.au', '4683842798', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 9, 1),
(29, 8, 'usershankey@sxda.com.au', '$2y$10$8c6BlzqmmzSlP9BQ6lRaTu4N0GKtqi34BKeN3DNQcgw9JA7Wfez3W', NULL, 'User 1', 'Jain', 'usershankey@sxda.com.au', '546545', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 3, 1),
(30, 21, 'broker1@northbase.io', '$2y$10$MVe/DZuIvT6OKshcLXFN2Oba6s3VGS094IMBE1liuZGtmW5v4badi', NULL, 'Stuart', 'Cox', 'broker1@northbase.io', '0438560629', '1212121212', '', NULL, NULL, NULL, NULL, NULL, NULL, 3, 3),
(32, 30, 'u33ser1@sxda.com.au', '$2y$10$E4rJDgR7C/N0gSxiuXwj/uhP7SYGKkdd/XbWczioUt3D/lQ7t2JkS', NULL, 'sxda fff', 'jain', 'u33ser1@sxda.com.au', '', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 7, 1),
(33, 30, 'subbroker1@northbase.io', '$2y$10$7lXv8WFzCE02wUwkhfsGxe/2hsRD2cEgcbdV4bh9twmbLcjQYBiEy', NULL, 'Sub', 'Broker', 'subbroker1@northbase.io', '', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 7, 3),
(38, 5, 's11hankey@sxda.com.au', '$2y$10$lwPtMuvtUqZl0uuwq.nO2eAeFa66uC4rjE5fcLjPy4klFWy/7Jz7.', NULL, 'Anshu', 'Jain', 's11hankey@sxda.com.au', '9119188885', '', '', NULL, NULL, NULL, NULL, NULL, NULL, 3, 3),
(39, 5, 's111hankey@sxda.com.au', '$2y$10$QrQlyd85eMaPuJilYK4Eb.lFv2q7mJTlsjdXIgKfVYPF1Guc8il7u', 'DUO FINANCE PTY LTD', 'User 10', 'Shankey', 's111hankey@sxda.com.au', '9468590655', '79640471101', NULL, NULL, NULL, NULL, NULL, NULL, '', 3, NULL),
(40, 21, 'admin@cluefinance.com.au', '$2y$10$HkrOYDH7kDS0vVL700tQte4Tebkjy72NWjs1VN.Z8/XnHe/79PwX2', NULL, 'Clue', 'Finance', 'admin@cluefinance.com.au', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 1),
(41, NULL, 'eamonn.j.keogh@gmail.com', '$2y$10$UK684nJkVMhZiLk4DHRUn.LY.S9p7/EygwP8QJ.zFqLqpvFsEHhLq', 'Duo Finance 1', 'Eamonn', 'Keogh', 'eamonn.j.keogh@gmail.com', '0409409310', '79640471101', '', NULL, NULL, NULL, 8, NULL, NULL, 3, 1),
(42, 16, 'gunjit@northbase.au', '$2y$10$3tCBXNKWBZh4zju.3SU5X.FtmO58gKU9RQfqCdaom6aOWKitAExjW', NULL, 'Gunjit', 'Singh', 'gunjit@northbase.au', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 1),
(50, 5, 'test99@northbase.dev', '$2y$10$6O3Pp8tI6StV4OoLCl0HfeKZNFFMfzmHNtY1S/gVnLSPz1F4SWjse', 'Abhi', 'Abhishek333', 'Jn', 'test99@northbase.dev', '444444', '', '', NULL, 3, NULL, 3, NULL, '', 3, NULL),
(54, NULL, 'feb24@northbase.io', '$2y$10$OGLwaBr3ialgGF7b6oPzfOgnzbnJ7Dho9096wXSKiyVahTgu8wJxq', 'Northbase Digital', 'Stuart', 'Cox', 'feb24@northbase.io', '0438560629', '62649069778', NULL, 1, 1, NULL, 1, NULL, 'Queensland', 3, 1),
(55, NULL, 'anshu_77777@yahoo.co.in', '$2y$10$CU4d65IYVMUA.cESD6W1xOanxP4FlGi5m4BzIm4P3DB7VhzSF2PRu', 'Dev Testing', 'Ansh', 'Check', 'anshu_77777@yahoo.co.in', '9468590655', 'ABN-1677', '465', NULL, 3, NULL, 5, NULL, NULL, 3, 1),
(60, NULL, 'wed26feb@northbase.io', '$2y$10$d5HZwE4CqBYwLRyqsCOkWe1x1hjRYRPR4iGlULOR9qa1NrXUacova', 'GOOD MARMALADE BOOKKEEPING', 'Stuart', 'Cox', 'wed26feb@northbase.io', '0438560629', '93098808406', NULL, NULL, 1, NULL, 1, NULL, 'Queensland', 3, 1),
(62, NULL, 'abhidevphp2@gmail.com', '$2y$10$XE04ACWKSvfFk/XbaRLjGOclisK255r/FyYxn7FEJoE0BsD.EHRhi', 'DUO FINANCE PTY LTD', 'Abhishek', 'cox', 'abhidevphp2@gmail.com', '9468590655', '79640471101', NULL, NULL, 1, NULL, 7, NULL, '', 3, 1),
(68, NULL, 'abhidevphp11@gmail.com', '$2y$10$gNhpWclEQSyYCeLqf4Ebw.GYdFtJ507zhD3SvbfBccbq3SspSTRmW', 'DUO FINANCE PTY LTD', 'Trial333', 'Jain', 'abhidevphp11@gmail.com', '9468590655', '79640471101', NULL, 2, 3, NULL, 6, NULL, 'California', 3, 1),
(73, NULL, 'gunjitsingh@hotmail.com', '$2y$10$xtpFfJWZ8laDUEubFQC.AOeGxttUR23YLihChz6NTrz70Vca8XHMq', 'THE TRUSTEE FOR RML EQUIPMENT TRUST', 'Gunjit', 'singh', 'gunjitsingh@hotmail.com', '12345678', '76771702314', NULL, NULL, 1, NULL, 3, NULL, 'California', 3, 1),
(74, NULL, 'frodobaggins@northbase.app', '$2y$10$O6G9SQiCDK7i6WoAwZ34guO6N/S04.O9m/QyzKvWeybIzt8mikncW', 'Northbase Digital', 'Frodo', 'baggins', 'frodobaggins@northbase.app', '1234567890', '62649069778', NULL, NULL, 1, NULL, 5, NULL, 'New South Wales', 3, 1),
(75, 74, 'samwise@northbase.app', '$2y$10$0CqEruRSaNJ4K7x8QHLTveJav1anNtZ9NWgQrbAVFlwpNiQzbTfQq', NULL, 'Samwise', 'gamchi', 'samwise@northbase.app', '98765dddd', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 3, 1),
(76, NULL, 'renne@northbase.app', '$2y$10$.S2kF85adM66n9C19KKBLOsG5hW0DxiBiXjrzBg9gqbns0trj.nz6', 'GetMax Business register', 'Renne', 'Spoon', 'renne@northbase.app', '098765456', '68622550681', NULL, NULL, 1, NULL, 7, NULL, 'Pulau Pinang', 3, 1),
(77, NULL, 'jackdaniels@northbase.app', '$2y$10$MKdCoGX6OiARI8cvhfKZPeCb5NOUA2mTkvud222LVtOPR/9rODyUq', 'QUEENSLAND & PACIFIC PTY. LTD.', 'Jack', 'Daniels', 'jackdaniels@northbase.app', '1234567890', '72081370685', NULL, NULL, 1, NULL, 6, NULL, 'Kerala', 3, 1),
(78, NULL, 'harrypotter@northbase.app', '$2y$10$A.3XhSfKIbt9EyrJ8o1wgudUTc/QwMdhlJcAFFS0ycx60ZfqmPT5u', 'QUEENSLAND & PACIFIC PTY. LTD.', 'Harry', 'potter', 'harrypotter@northbase.app', '019836564', '72081370685', NULL, NULL, 1, NULL, 7, NULL, 'Hamburg', 3, 1),
(79, NULL, '24march1@northbase.io', '$2y$10$KBEMEQqodA.CTqLgpvIyUO4x4E2bBAmRelqjzP1bSGCg16YdPtiBG', 'MOUNT ISA SIGNS', 'Stuart', 'Cox', '24march1@northbase.io', '0438560629', '11644150210', NULL, NULL, 6, NULL, 1, NULL, 'Queensland', 3, 1),
(80, NULL, 'rohitsharma@northbase.app', '$2y$10$skAlWiD5SvtUMcLQpxc/4e66.0JNN1/2Jv/t4jSjKTr8GbKOSLjz6', 'Northbase', 'ROhit', 'Sharma', 'rohitsharma@northbase.app', '129876456', '62649069778', NULL, 2, 1, NULL, 6, '', 'West Bengal', 4, 1),
(86, 16, 'abhishek@northbase.io', '$2y$10$25eYk138SerePmF.pHDHPeSH9TFYFTuuxY3YipsNL5thp9VFyNl8G', NULL, 'Abhishek', 'Jain', 'abhishek@northbase.io', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 1),
(88, 42, 'asharveersingh@gmail.com', '$2y$10$fREc6b1K7R5LYnulLHvUfu4uKjpcO5e4E86UUo0MA71LuOuUXu5pO', NULL, 'Asharveer', 'Singh', 'asharveersingh@gmail.com', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 1),
(91, NULL, 'referrer1@northbase.io', '$2y$10$xJvlxsl05ZArgxGCmKWFPOx898DcSaMCrh1/gOuZ8SDRskPU0NN06', 'SPACESHIP CAPITAL LIMITED', 'Referrer', 'One', 'referrer1@northbase.io', '0438560629', '67621011649', NULL, NULL, 1, NULL, 1, NULL, 'Victoria', 3, 1),
(92, 91, 'referrer2@northbase.io', '$2y$10$BKfMD3YQI9zJTHgTtyfa6uysxntdBvDAXoqkQk/qJj13fQoTB4EdO', NULL, 'Referrer', 'Two', 'referrer2@northbase.io', '0438560629', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 3, 1),
(100, NULL, 'referrer4@northbase.io', '$2y$10$bYdUPcfygEEwuxnyQQ0feerBnsrjA6WhO5S7sGD2F2Mvmei39mAum', 'GOOD TIMES & CO PTY LTD', 'Stuart', 'Cox', 'referrer4@northbase.io', '0438560629', '57669714167', NULL, NULL, 2, NULL, 1, NULL, 'Victoria', 3, 1),
(101, 80, 'testusernew9@northbase.app', '$2y$10$vwVVYDT/qvLMzHqGK0Z.Ke9zLLsmDaXbw8.A1IZfib0fkKZx9ylQe', NULL, 'Test', 'user', 'testusernew9@northbase.app', '1234', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 3, 1),
(102, 80, 'customer19aug@northbase.app', '$2y$10$nOL0t3NPfOCEuwVh5sbS.uv6RqTTcV19qSh5ST74TOPrln2CGssrK', NULL, 'Test 19 aug', 'customer', 'customer19aug@northbase.app', '12213', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, 1),
(103, 42, 'referrer19aug@northbase.app', '$2y$10$BPOQ1ryYFknhalZygIXl9OjU8G0D.Fp4AweyRw4UKbhy6XyZz4CdK', 'Northbase Digital', 'Customer', '19 AUg', 'referrer19aug@northbase.app', '123456789', '62649069778', NULL, NULL, 5, NULL, 7, '', 'Queensland', 3, 5),
(105, NULL, 'abhidevphp1@gmail.com', '$2y$10$IW3C68TK/gv5EFGDrhDkzOsudr6SOpSUaNzXtzeceHYyT8udy6bS6', 'Northbase', 'Shankey', 'Jain', 'abhidevphp1@gmail.com', '9468590655', '62649069778', NULL, NULL, 1, NULL, 6, 'Shank', 'New South Wales', 3, 1),
(106, 42, 'singhgunjit@hotmail.com', '$2y$10$ZaYBHyCZHMQyXXmaH6R0QOkpGaTzobfVGmJywkH0fQD0/CnfEPGSO', NULL, 'Ashar', 'Veer', 'singhgunjit@hotmail.com', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 2, 1),
(107, 91, 'referreradmin@northbase.io', '$2y$10$Cqp5CJF89ijSdxicYqA67uNKv180tnwT6W1drWjFsB37M0.tKfkyy', NULL, 'Referrer', 'Admin', 'referreradmin@northbase.io', '0438560629', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, 1),
(108, 62, 'abhishek1@northbase.au', '$2y$10$I66n1O1.XmeM2rAo1JTj1uxOdeSxpWT5R58BAyCLlJUkHUBJv2/ia', NULL, 'Abhishek', 'Jain', 'abhishek1@northbase.au', '9468590655', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 3, 1),
(109, NULL, 'abhishek-dev@northbase.dev', '$2y$10$1lvUuL9C723HgmxE./rCLuwaLpv7L/3O3GLrNm5nuNqUHPhfSw7HW', 'Northbase Digital', 'Abhishek', 'Jain', 'abhishek-dev@northbase.dev', '9468590655', '62649069778', NULL, NULL, 1, NULL, 3, 'Testing Trading', 'Queensland', 3, 1),
(110, NULL, 'abhishek-jain@northbase.dev', '$2y$10$BtEhc2EIJh.vMIezDPjSYO0G/bGeh/RJ48CdFWAtHBN06gBegLLZK', NULL, 'Abhishek', 'Jain', 'abhishek-jain@northbase.dev', '9468590655', '22524838911', NULL, NULL, 4, NULL, 6, 'Sterling...', 'Queensland', 3, 1),
(111, NULL, 'customer2@northbase.dev', '$2y$10$MGw3LLg/seg0bJ8aqC08MeQnCnFyMKcKiD32lpOYURv2ql6LnLLfS', 'Northbase', 'Ram', 'jn', 'customer2@northbase.dev', '999999999', '62649069778', NULL, NULL, 4, NULL, 5, 'Testing', 'New South Wales', 3, 1),
(112, NULL, 'customer3@northbase.dev', '$2y$10$/xReKMLRhKFE28sEgoiGLeVIaI7RMGd57nbFzCx1g95wZwUUKn3w6', NULL, 'Anshu', 'jain', 'customer3@northbase.dev', '999999999', '22524838911', NULL, NULL, 2, NULL, 5, 'Sterling', 'Western Australia', 3, 1),
(113, NULL, 'customer4@northbase.dev', '$2y$10$BrM94hYjt1zhV/CxQNAwuOdqTPkY4qoK6IPvjoAXvmS1xSSr8GEY.', NULL, 'Anshu', 'Singh', 'customer4@northbase.dev', '999999999', '22524838911', NULL, NULL, 3, NULL, 4, '', 'Victoria', 3, 1),
(114, NULL, 'customer6@northbase.dev', '$2y$10$8cn.gwIPwbo2D9Ff.MAKw.M4rOeFlLlp8KUirWK4k/xe023TcoGWe', NULL, 'Abhishek', 'Jain', 'customer6@northbase.dev', '988888888', '22524838911', NULL, NULL, 3, NULL, 3, '', 'Victoria', 3, 1);
