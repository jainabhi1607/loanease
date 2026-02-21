
-- --------------------------------------------------------

--
-- Table structure for table `loan_decline_reasons`
--

CREATE TABLE `loan_decline_reasons` (
  `id` int(11) NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `date_time` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `loan_decline_reasons`
--

INSERT INTO `loan_decline_reasons` (`id`, `title`, `date_time`) VALUES
(1, 'Client does not have enough working capital', '2024-09-27 11:59:50'),
(2, 'Bad Credit History', '2024-09-27 11:59:59'),
(3, 'Does not meet servicing', '2024-09-29 22:05:59'),
(4, 'Does not meet lender policy', '2024-10-22 23:55:47');
