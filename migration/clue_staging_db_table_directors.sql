
-- --------------------------------------------------------

--
-- Table structure for table `directors`
--

CREATE TABLE `directors` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `name` varchar(150) DEFAULT NULL,
  `last_name` varchar(150) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

--
-- Dumping data for table `directors`
--

INSERT INTO `directors` (`id`, `user_id`, `name`, `last_name`) VALUES
(1, 6, 'Shankey', 'Jn'),
(2, 6, 'Abhishek', 'Jain'),
(3, 6, 'Stuart', 'Cox'),
(4, 6, '', ''),
(5, 6, '', ''),
(6, 6, '', ''),
(7, 7, 'Shankey', 'Jn'),
(8, 7, 'Abhishek', 'Jain'),
(9, 7, 'Stuart', 'Cox'),
(10, 8, 'Shankey Abhishek Stuart', 'Jn Jain Cox'),
(11, 8, 'Shankey Abhishek Stuart', 'Jn Jain Cox'),
(12, 8, 'Shankey Abhishek Stuart', 'Jn Jain Cox'),
(13, 13, 'Shankey', 'Jain'),
(14, 13, 'Abhishek', 'Jain'),
(15, 15, 'Jim', 'Jones'),
(16, 16, 'Shankey', 'Jain'),
(17, 17, 'test', 'test'),
(18, 17, 'test', 'test'),
(19, 19, 'Luay', 'Khreish'),
(20, 19, 'Eamonn', 'Keogh'),
(21, 19, 'Chris', 'Anesco'),
(22, 20, 'Eamonn', 'Keogh'),
(23, 20, 'Chris', 'Anesco'),
(24, 20, 'Luay', 'Khreish'),
(25, 43, 'Simple', 'Singh'),
(26, NULL, 'Jack', 'daniel'),
(27, NULL, 'JAck', 'daniel'),
(28, 45, 'Roger', 'Daniel'),
(29, 51, 'Gunjit', 'daniel'),
(30, 52, 'JAck', 'Daniels'),
(31, 56, 'Anshveer', 'singh'),
(32, 61, 'Testing First', 'Testing Last Name'),
(33, 67, 'Jack', 'Daniels'),
(34, 72, 'Gunjit', 'Singh'),
(35, 54, 'Stuart', 'Cox'),
(36, 68, 'Stuart', 'Cox'),
(37, 68, 'Warren', 'Cox'),
(38, 80, 'One', 'Two'),
(39, 80, 'THree', 'Four');
