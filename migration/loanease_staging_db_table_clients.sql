
-- --------------------------------------------------------

--
-- Table structure for table `clients`
--

CREATE TABLE `clients` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `entity` int(3) DEFAULT NULL,
  `entity_name` varchar(200) DEFAULT NULL,
  `first_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `mobile` varchar(50) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `abn` varchar(150) DEFAULT NULL,
  `acn` varchar(150) DEFAULT NULL,
  `time_in_business` date DEFAULT NULL,
  `industry` int(2) DEFAULT NULL,
  `organisation_name` varchar(255) DEFAULT NULL,
  `state` varchar(150) DEFAULT NULL,
  `status` int(1) DEFAULT NULL,
  `date_time` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `clients`
--

INSERT INTO `clients` (`id`, `user_id`, `entity`, `entity_name`, `first_name`, `last_name`, `mobile`, `email`, `abn`, `acn`, `time_in_business`, `industry`, `organisation_name`, `state`, `status`, `date_time`) VALUES
(1, 8, 3, 'Clubhouse Digital', 'Abhishek', 'Jain', '9468590655', 'abhishek@sxda.com.au', '62649069778', 'ACN-987654', '2021-03-29', NULL, NULL, '', 1, NULL),
(2, 8, 1, NULL, 'Stuart', 'cox', '4839-1671', 'user1@sxda.com.au', 'ABN-876', 'ACN-35345', NULL, NULL, NULL, NULL, 1, NULL),
(3, 21, NULL, NULL, 'Jim', 'Jones', '0438560629', 'jimjones@northbase.io', '112121221', '', NULL, NULL, NULL, NULL, 1, '2024-08-12 05:47:49'),
(4, 30, 1, NULL, 'Stuart', 'Cox', '0438560629', 'client1@northbase.io', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(5, 30, 4, NULL, 'Abhishek', 'Jain', '9468590655', 'abhishek@sxda.com.au', '62649069778', 'ACN-99999', '2021-03-29', NULL, 'STUART COX DIGITAL AGENCY', NULL, NULL, NULL),
(6, 20, 1, NULL, 'Steve', 'Smith', '0409409310', 'test@abcbiz.com.au', '79640471101', '', '2020-04-01', NULL, 'DUO FINANCE PTY LTD', NULL, NULL, NULL),
(7, 30, 3, '', 'Abhishek', 'Jain', '9468590655', 'abhishek@sxda.com.au', 'ABN-877777', 'ACN-99999', NULL, NULL, '', '', NULL, NULL),
(8, 8, 3, NULL, 'Abhishek', 'Jain', '9468590655', '11abhishek@sxda.com.au', '62649069778', '', '2021-03-29', NULL, 'STUART COX DIGITAL AGENCY', NULL, NULL, NULL),
(9, 30, 1, NULL, 'Stuart', 'Cox', '', '', '23423423', '', NULL, NULL, '', NULL, 1, NULL),
(10, 8, 2, 'Northbase', 'Shankey', 'Jn', '9119188885', 'abhidevphp2@gmail.com', '62649069778', NULL, '2021-03-29', 8, 'STUART COX DIGITAL AGENCY', 'Queensland', 1, NULL),
(11, 20, 1, NULL, 'Eamonn', 'Keogh', '0409409310', 'eamonn.j.keogh@gmail.com', '79640471101', NULL, '2020-04-01', NULL, 'DUO FINANCE PTY LTD', NULL, 1, NULL),
(12, 43, 1, 'Motorola Razr', 'ROger', 'Smith', 'fd', 'Roger@northbase.app', '62649069778', NULL, '2021-03-29', 1, 'STUART COX DIGITAL AGENCY', 'New York', 1, NULL),
(13, 44, 1, 'Jio CInema', 'Apsara', 'Pencil', '3445345', 'apsara@northbase.app', '62649069778', NULL, '2021-03-29', 1, 'STUART COX DIGITAL AGENCY', 'Québec', 1, NULL),
(14, 42, 4, 'Home Lite', 'Noise', 'BUds', '123', 'noise@northbase.app', '62649069778', NULL, '2021-03-29', 13, 'STUART COX DIGITAL AGENCY', 'Kentucky', 1, NULL),
(15, 51, 1, 'Stephen Prep School', 'Swagath', 'Smith', 'fd', 'swagath@northbase.app', '62649069778', NULL, '2021-03-29', 8, 'STUART COX DIGITAL AGENCY', 'Auckland', 1, NULL),
(16, 53, 1, 'ENVIE COOPER', 'Duracell', 'Battery', 'POLAND', 'anshveer2404@gmail.com', '65623179233', NULL, '2017-12-01', 2, 'HUMAN PIXEL PTY LTD', 'Uttar Pradesh', 1, NULL),
(17, 54, 1, 'February 24', 'Sharon', 'Hughes', '0438560629', 'sharonhughes@northbase.io', '93098808406', NULL, '2017-07-01', 1, 'GOOD MARMALADE BOOKKEEPING', 'Queensland', 1, '2025-02-23 23:51:08'),
(18, 55, 2, 'Abhishek Jain', 'New', 'Client', '9468590655', 'abhidevphp2@gmail.com', '62649069778', NULL, '2021-03-29', 8, 'STUART COX DIGITAL AGENCY', '', 1, '2025-02-24 11:08:29'),
(21, 61, 1, 'FONTERRA AUSTRALIA PTY LTD', 'Client first', 'client Last', '1234', '', '52006483665', NULL, '2000-07-01', 13, NULL, 'Northland', 1, '2025-02-26 06:39:24'),
(22, 63, 1, 'SUNRISE KITCHEN', 'Deepika', 'Padukone', '123789654', 'deepika@northbase.app', '35605455936', NULL, '2015-06-01', 12, NULL, 'Canterbury', 1, '2025-02-26 16:01:19'),
(23, 63, 1, 'FONTERRA AUSTRALIA PTY LTD', 'sangung', 'APple', '12345678', 'samsung@northbase.com', '52006483665', NULL, '2000-07-01', 8, NULL, 'Texas', 1, '2025-02-27 08:45:54'),
(24, 64, 4, 'INDEPENDENT RACKING INSPECTIONS AND AUDITS PTY. LTD.', 'The', 'Tribune', '12334442', 'tribune@northbase.app', '22135145998', NULL, '2009-02-09', 13, NULL, 'Punjab', 1, '2025-02-28 05:05:57'),
(27, 76, 1, '', 'Sunita', 'Williams', '7946135487', 'sunita@northbase.app', '62649069778', NULL, '2021-03-29', 12, NULL, 'New South Wales', 1, '2025-03-19 14:58:29'),
(28, 79, 1, '', 'Sharon', 'Hughes', '0438560629', 'sharonhughes@northbase.io', '93098808406', NULL, '2011-06-29', 11, NULL, 'Queensland', 1, '2025-03-24 16:09:43'),
(29, 80, 1, 'BISTA BUSINESS SERVICES PTY LTD', 'Rishabh', 'Pant', '9874561320', 'rishabhpant@northbase.app', '24677301656', NULL, '2024-05-13', 13, NULL, 'West Bengal', 1, '2025-03-24 17:17:36'),
(30, 80, 3, '150 SQUARE PTY LTD', 'Pat', 'Cummins', '1928387465', 'patcummins@northbase.app', '39637965774', NULL, '2019-12-16', 10, NULL, 'Île-de-France', 1, '2025-03-24 17:23:22'),
(31, 79, 1, 'TELSTRA INFRACO', 'Stuart', 'Cox', '0438560629', '24march3@northbase.io', '33051775556', NULL, '1999-11-01', 1, NULL, 'Queensland', 1, '2025-03-24 20:12:55'),
(32, 79, 1, 'Northbase Digital', 'Stuart', 'Cox', '0438560629', 'client24march@northbase.io', '62649069778', NULL, '2021-03-29', 1, NULL, 'Queensland', 1, '2025-03-24 20:15:52'),
(33, 79, 2, 'ROCKET ACCOUNTS PTY LTD', 'Barry', 'Bonds', '0438560629', 'clientbarrybonds@northbase.io', '45668850600', NULL, '2023-06-16', 1, NULL, 'Queensland', 1, '2025-03-24 20:20:46'),
(34, 80, 3, '150 SQUARE PTY LTD', 'Prince', 'Kumar', '789654123', 'princekumar@northbase.app', '39637965774', NULL, '2019-12-16', 9, NULL, 'Tamil Nadu', 1, '2025-03-25 15:19:12'),
(35, 91, 1, 'The trustee for Ruley\'s Family Trust', 'Stuart', 'Cox', '0438560629', 'spaceship@northbase.io', '', NULL, '2009-10-19', 1, NULL, 'Victoria', 1, '2025-05-05 14:56:00'),
(36, 93, 1, 'The trustee for Ruley\'s Family Trust', 'Stuart', 'Cox', '0438560629', 'rulye@northbase.io', '13550624524', NULL, '2009-10-19', 1, NULL, 'New South Wales', 1, '2025-05-13 13:45:33'),
(37, 80, 2, 'SUNRISE KITCHEN', 'New Client', '8 uly', '9876543210', 'newclient@northbase.app', '35605455936', NULL, '2015-04-23', 14, NULL, 'Queensland', 1, '2025-07-09 03:16:43'),
(38, 101, 1, 'CROP CIRCLE MEDIA', 'James', 'Thor', '13333444', 'jamesthor@northbase.app', '53310725464', NULL, '2021-08-17', 13, NULL, 'Queensland', 1, '2025-07-09 13:09:20'),
(39, 8, NULL, '', 'Abhishek', 'Jain', '4465465456', 'test21@northbase.com', '', NULL, NULL, NULL, NULL, '', 1, '2025-10-13 17:58:12'),
(40, 73, NULL, '', 'Lando', 'Norris', '0438560629', 'lando@northbase.io', '', NULL, NULL, NULL, NULL, '', 1, '2025-10-13 17:59:39'),
(41, 92, NULL, '', 'Lewis', 'Hamilton', '0438560629', 'lewis@northbase.io', '', NULL, NULL, NULL, NULL, '', 1, '2025-10-14 18:02:21'),
(42, 92, 1, 'The trustee for Ruley\'s Family Trust', 'Toto', 'Wolf', '0438560629', 'toto@northbase.io', '13550624524', NULL, '2009-10-19', 1, NULL, 'Queensland', 1, '2025-10-14 18:06:49');
